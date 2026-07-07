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
  on_conflict?: string
  default_message_delay_ms?: number
}

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  if (me.funcao !== 'OWNER') {
    throw createError({ statusCode: 403, statusMessage: 'Apenas o dono pode criar fluxos.' })
  }
  const body = await readBody<Body>(event)
  const name = body.name?.trim()
  if (!name) throw createError({ statusCode: 400, statusMessage: 'name obrigatório.' })
  const triggerType = body.trigger_type
  if (!triggerType || !VALID_TRIGGERS.includes(triggerType)) {
    throw createError({ statusCode: 400, statusMessage: 'trigger_type inválido.' })
  }
  const onConflict = body.on_conflict ?? 'skip'
  if (!VALID_CONFLICT.includes(onConflict)) {
    throw createError({ statusCode: 400, statusMessage: 'on_conflict inválido.' })
  }

  const admin = useSupabaseAdmin()
  const { data, error } = await admin
    .from('flows')
    .insert({
      companies_id: me.companieId,
      name,
      trigger_type: triggerType,
      trigger_config: body.trigger_config ?? {},
      graph: { nodes: [], edges: [] },
      status: 'draft',
      on_conflict: onConflict,
      default_message_delay_ms: body.default_message_delay_ms ?? 3000,
      created_by: me.userId,
    })
    .select('id')
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { id: (data as { id: string }).id }
})
