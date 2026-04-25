import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  if (me.funcao !== 'OWNER') {
    throw createError({ statusCode: 403, statusMessage: 'Apenas o dono.' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id obrigatório.' })

  const admin = useSupabaseAdmin()
  const { data: existing } = await admin
    .from('agenda_templates')
    .select('id, companie_id')
    .eq('id', id)
    .maybeSingle()

  if (!existing || existing.companie_id !== me.companieId) {
    throw createError({ statusCode: 404, statusMessage: 'Template não encontrado.' })
  }

  const { error } = await admin
    .from('agenda_templates')
    .delete()
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true, id }
})
