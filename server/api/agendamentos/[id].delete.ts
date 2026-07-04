import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { getIntegrationAccessToken } from '~~/server/utils/google-integration'
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
    .select('id, companie_id, status_agenda, integration_id, source_calendar_id, is_external')
    .eq('id', id)
    .maybeSingle()

  if (exErr || !existing) {
    throw createError({ statusCode: 404, statusMessage: 'Agendamento não encontrado.' })
  }
  if (existing.companie_id !== me.companieId) {
    throw createError({ statusCode: 403, statusMessage: 'Sem permissão.' })
  }
  if (existing.is_external) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Evento externo do Google. Exclua direto no Google Calendar.',
    })
  }

  if (existing.status_agenda !== 'Cancelado' && existing.integration_id && existing.source_calendar_id) {
    const { data: srcCal } = await admin
      .from('google_calendars')
      .select('gg_calendar_id')
      .eq('id', existing.source_calendar_id)
      .maybeSingle()

    if (srcCal) {
      try {
        const { accessToken } = await getIntegrationAccessToken(existing.integration_id)
        await deleteEvent(accessToken, srcCal.gg_calendar_id, id, sendUpdates)
      } catch (err) {
        const e = err as { statusCode?: number }
        if (e.statusCode !== 404 && e.statusCode !== 410 && e.statusCode !== 412) throw err
        // 404/410: já não existe no Google. 412: integração desconectada — segue.
      }
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
