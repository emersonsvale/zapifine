import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  const admin = useSupabaseAdmin()

  const { data, error } = await admin
    .from('flows')
    .select(
      'id, name, trigger_type, trigger_config, status, version, published_version, on_conflict, default_message_delay_ms, created_at, updated_at, published_at',
    )
    .eq('companies_id', me.companieId)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  return { flows: data ?? [] }
})
