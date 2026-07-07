import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

const VALID_TRIGGERS = [
  'lead_new_message',
  'lead_archived_message',
  'lead_in_service_message',
  'lead_column_changed',
  'manual_chat',
]
const VALID_CONFLICT = ['skip', 'queue', 'abort_previous']

type Body = {
  name?: string
  trigger_type?: string
  trigger_config?: Record<string, unknown>
  graph?: { nodes: unknown[]; edges: unknown[]; entry?: string }
  on_conflict?: string
  default_message_delay_ms?: number
  status?: 'draft' | 'archived'
}

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  if (me.funcao !== 'OWNER') {
    throw createError({ statusCode: 403, statusMessage: 'Apenas o dono pode editar fluxos.' })
  }
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id obrigatório.' })

  const admin = useSupabaseAdmin()
  const { data: existing } = await admin
    .from('flows')
    .select('id, companies_id')
    .eq('id', id)
    .maybeSingle()
  if (!existing || (existing as { companies_id: string }).companies_id !== me.companieId) {
    throw createError({ statusCode: 404, statusMessage: 'Fluxo não encontrado.' })
  }

  const body = await readBody<Body>(event)
  const patch: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const n = body.name.trim()
    if (!n) throw createError({ statusCode: 400, statusMessage: 'name vazio.' })
    patch.name = n
  }
  if (body.trigger_type !== undefined) {
    if (!VALID_TRIGGERS.includes(body.trigger_type)) {
      throw createError({ statusCode: 400, statusMessage: 'trigger_type inválido.' })
    }
    patch.trigger_type = body.trigger_type
  }
  if (body.trigger_config !== undefined) patch.trigger_config = body.trigger_config
  if (body.graph !== undefined) {
    if (!Array.isArray(body.graph.nodes) || !Array.isArray(body.graph.edges)) {
      throw createError({ statusCode: 400, statusMessage: 'graph inválido.' })
    }
    patch.graph = body.graph
  }
  if (body.on_conflict !== undefined) {
    if (!VALID_CONFLICT.includes(body.on_conflict)) {
      throw createError({ statusCode: 400, statusMessage: 'on_conflict inválido.' })
    }
    patch.on_conflict = body.on_conflict
  }
  if (body.default_message_delay_ms !== undefined) {
    patch.default_message_delay_ms = Math.max(0, Math.floor(body.default_message_delay_ms))
  }
  if (body.status !== undefined) {
    if (body.status !== 'draft' && body.status !== 'archived') {
      throw createError({ statusCode: 400, statusMessage: 'status inválido.' })
    }
    patch.status = body.status
  }

  if (Object.keys(patch).length === 0) return { ok: true, id }

  patch.updated_at = new Date().toISOString()
  const { error } = await admin.from('flows').update(patch).eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true, id }
})
