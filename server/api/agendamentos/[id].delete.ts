import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { getCompanyAccessToken } from '~~/server/utils/google-token'
import { deleteEvent } from '~~/server/utils/google-calendar'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id obrigatório.' })
  }

  const query = getQuery(event)
  const sendUpdates =
    query.send_updates === 'none' || query.send_updates === 'externalOnly'
      ? (query.send_updates as 'none' | 'externalOnly')
      : 'all'

  const admin = useSupabaseAdmin()
  const { data: existing, error: exErr } = await admin
    .from('agendamentos')
    .select('id, companie_id, status_agenda')
    .eq('id', id)
    .maybeSingle()

  if (exErr || !existing) {
    throw createError({ statusCode: 404, statusMessage: 'Agendamento não encontrado.' })
  }
  if (existing.companie_id !== me.companieId) {
    throw createError({ statusCode: 403, statusMessage: 'Sem permissão.' })
  }

  if (existing.status_agenda !== 'Cancelado') {
    const { accessToken, calendarId } = await getCompanyAccessToken(me.companieId)
    try {
      await deleteEvent(accessToken, calendarId, id, sendUpdates)
    } catch (err) {
      const e = err as { statusCode?: number }
      if (e.statusCode !== 404 && e.statusCode !== 410) throw err
      // 404/410: evento já não existe no Google. Continua marcando cancelado.
    }
  }

  const { error: upErr } = await admin
    .from('agendamentos')
    .update({ status_agenda: 'Cancelado' })
    .eq('id', id)

  if (upErr) {
    throw createError({
      statusCode: 500,
      statusMessage: `Falha ao marcar como cancelado: ${upErr.message}`,
    })
  }

  // Cancela lembretes pendentes
  await admin
    .from('agenda_lembretes')
    .update({ status: 'skipped' })
    .eq('agendamento_id', id)
    .eq('status', 'pending')

  return { ok: true, id }
})
