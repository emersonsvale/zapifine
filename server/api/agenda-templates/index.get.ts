import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  const admin = useSupabaseAdmin()

  const { data, error } = await admin
    .from('agenda_templates')
    .select('*')
    .eq('companie_id', me.companieId)
    .order('channel', { ascending: true })
    .order('kind', { ascending: true })
    .order('minutes_before', { ascending: true, nullsFirst: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { templates: data ?? [] }
})
