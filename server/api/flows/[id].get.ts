import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id obrigatório.' })

  const admin = useSupabaseAdmin()
  const { data, error } = await admin
    .from('flows')
    .select('*')
    .eq('id', id)
    .eq('companies_id', me.companieId)
    .maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Fluxo não encontrado.' })
  return { flow: data }
})
