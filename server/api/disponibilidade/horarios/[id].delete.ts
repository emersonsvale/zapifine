import { requireDisponibilidadeAccess } from '~~/server/utils/disponibilidade-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id obrigatório.' })
  }

  const admin = useSupabaseAdmin()
  const { data: row, error: gErr } = await admin
    .from('agenda_horarios_semanal')
    .select('id, user_id, companie_id')
    .eq('id', id)
    .maybeSingle()

  if (gErr || !row) {
    throw createError({ statusCode: 404, statusMessage: 'Horário não encontrado.' })
  }

  const me = await requireDisponibilidadeAccess(event, row.user_id)
  if (row.companie_id !== me.companieId) {
    throw createError({ statusCode: 403, statusMessage: 'Sem permissão.' })
  }

  const { error } = await admin
    .from('agenda_horarios_semanal')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { ok: true, id }
})
