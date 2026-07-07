import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

type FlowRow = {
  id: string
  companies_id: string
  name: string
  graph: { nodes: unknown[]; edges: unknown[]; entry?: string } | null
  version: number
}

function validateGraph(graph: FlowRow['graph']): string | null {
  if (!graph) return 'Fluxo sem grafo.'
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) return 'Fluxo sem nós.'
  if (!Array.isArray(graph.edges)) return 'Fluxo sem arestas.'
  const hasTrigger = (graph.nodes as Array<{ type?: string }>).some(
    (n) => n.type === 'trigger',
  )
  if (!hasTrigger) return 'Fluxo precisa ter um nó de gatilho.'
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
