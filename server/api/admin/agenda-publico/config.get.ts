import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)

  const admin = useSupabaseAdmin()
  const { data, error } = await admin
    .from('companies')
    .select('id, name, agenda_publico_slug, agenda_publico_ativo, agenda_publico_titulo, agenda_publico_descricao')
    .eq('id', me.companieId)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { config: data }
})
