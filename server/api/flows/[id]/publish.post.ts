import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

type FlowRow = {
  id: string
  companies_id: string
  name: string
  graph: { nodes: unknown[]; edges: unknown[]; entry?: string } | null
  version: number
}

type GraphNode = {
  id: string
  type: string
  label?: string
  next?: string | null
  config?: Record<string, unknown>
}
type GraphEdge = { from: string; to: string }
type BranchCfg = { next?: string | null; label?: string | null; id?: string }

function validateGraph(graph: FlowRow['graph']): string | null {
  if (!graph) return 'Fluxo sem grafo.'
  const nodes = (graph.nodes as GraphNode[] | undefined) ?? []
  const edges = (graph.edges as GraphEdge[] | undefined) ?? []
  if (nodes.length === 0) return 'Fluxo sem nós.'
  if (!Array.isArray(edges)) return 'Fluxo sem arestas.'

  const triggers = nodes.filter((n) => n.type === 'trigger')
  if (triggers.length === 0) return 'Fluxo precisa ter um nó de gatilho.'
  if (triggers.length > 1) return 'Fluxo com mais de um nó de gatilho.'

  const byId = new Map(nodes.map((n) => [n.id, n]))
  for (const e of edges) {
    if (!byId.has(e.from)) return `Aresta com origem inválida: ${e.from}`
    if (!byId.has(e.to)) return `Aresta com destino inválido: ${e.to}`
  }

  const incoming = new Set<string>()
  for (const e of edges) incoming.add(e.to)

  for (const n of nodes) {
    if (n.type === 'trigger') continue
    if (!incoming.has(n.id)) {
      return `Nó "${n.label || n.type}" (${n.id.slice(0, 8)}) está desconectado — sem aresta de entrada.`
    }
  }

  const TERMINAL_TYPES = new Set(['end'])
  const hasOutgoing = new Set(edges.map((e) => e.from))
  for (const n of nodes) {
    if (TERMINAL_TYPES.has(n.type)) continue
    if (n.type === 'condition') {
      const cfg = (n.config ?? {}) as { branches?: BranchCfg[]; else?: string | null }
      const branches = Array.isArray(cfg.branches) ? cfg.branches : []
      if (branches.length === 0) return `Condição "${n.label || n.id.slice(0, 8)}" sem ramificações.`
      for (const b of branches) {
        if (!b.next) return `Condição "${n.label || n.id.slice(0, 8)}" tem ramo sem destino.`
        if (!byId.has(b.next)) return `Condição "${n.label || n.id.slice(0, 8)}" aponta para nó inexistente.`
      }
      if (!cfg.else) return `Condição "${n.label || n.id.slice(0, 8)}" sem ramo padrão (senão).`
      if (!byId.has(cfg.else)) return `Condição "${n.label || n.id.slice(0, 8)}" com senão inválido.`
      continue
    }
    if (n.type === 'wait_reply') {
      const cfg = (n.config ?? {}) as { branches?: { timeout?: string | null } }
      const t = cfg.branches?.timeout
      if (t && !byId.has(t)) return `Aguardar resposta "${n.label || n.id.slice(0, 8)}" com timeout inválido.`
      if (!hasOutgoing.has(n.id) && !t) {
        return `Nó "${n.label || n.type}" (${n.id.slice(0, 8)}) sem saída — conecte a um próximo nó ou defina timeout.`
      }
      continue
    }
    if (!hasOutgoing.has(n.id)) {
      return `Nó "${n.label || n.type}" (${n.id.slice(0, 8)}) sem saída — conecte a um próximo nó ou use um nó "Fim".`
    }
  }

  return null
}

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  if (me.funcao !== 'OWNER') {
    throw createError({ statusCode: 403, statusMessage: 'Apenas o dono pode publicar fluxos.' })
  }
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id obrigatório.' })

  const admin = useSupabaseAdmin()
  const { data, error } = await admin
    .from('flows')
    .select('id, companies_id, name, graph, version')
    .eq('id', id)
    .maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  const flow = data as FlowRow | null
  if (!flow || flow.companies_id !== me.companieId) {
    throw createError({ statusCode: 404, statusMessage: 'Fluxo não encontrado.' })
  }

  const invalid = validateGraph(flow.graph)
  if (invalid) throw createError({ statusCode: 400, statusMessage: invalid })

  const nextVersion = (flow.version ?? 1) + 1
  const now = new Date().toISOString()

  const { error: verErr } = await admin.from('flow_versions').insert({
    flow_id: flow.id,
    version: nextVersion,
    graph: flow.graph,
    published_by: me.userId,
    published_at: now,
  })
  if (verErr) throw createError({ statusCode: 500, statusMessage: verErr.message })

  const { error: updErr } = await admin
    .from('flows')
    .update({
      status: 'published',
      version: nextVersion,
      published_version: nextVersion,
      published_graph: flow.graph,
      published_at: now,
      updated_at: now,
    })
    .eq('id', flow.id)
  if (updErr) throw createError({ statusCode: 500, statusMessage: updErr.message })

  return { ok: true, id: flow.id, version: nextVersion }
})
