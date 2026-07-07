import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  if (me.funcao !== 'OWNER') {
    throw createError({ statusCode: 403, statusMessage: 'Apenas o dono pode excluir fluxos.' })
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

  const { error } = await admin
    .from('flows')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true, id }
})
