import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

const REMINDERS_BEFORE_MIN = [60, 15] // 1h e 15min antes

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id obrigatório.' })
  }

  const admin = useSupabaseAdmin()
  const { data: ag, error: exErr } = await admin
    .from('agendamentos')
    .select('id, companie_id, lead_id, gg_start, gg_title, status_agenda')
    .eq('id', id)
    .maybeSingle()

  if (exErr || !ag) {
    throw createError({ statusCode: 404, statusMessage: 'Agendamento não encontrado.' })
  }
  if (ag.companie_id !== me.companieId) {
    throw createError({ statusCode: 403, statusMessage: 'Sem permissão.' })
  }
  if (ag.status_agenda === 'Cancelado') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Agendamento cancelado não pode ser confirmado.',
    })
  }
  if (!ag.gg_start) {
    throw createError({ statusCode: 400, statusMessage: 'Agendamento sem data de início.' })
  }

  const { error: upErr } = await admin
    .from('agendamentos')
    .update({ status_agenda: 'Confirmado' })
    .eq('id', id)

  if (upErr) {
    throw createError({
      statusCode: 500,
      statusMessage: `Falha ao confirmar: ${upErr.message}`,
    })
  }

  // Limpa lembretes pendentes anteriores e enfileira novos
  await admin
    .from('agenda_lembretes')
    .delete()
    .eq('agendamento_id', id)
    .eq('status', 'pending')

  const startMs = new Date(ag.gg_start).getTime()
  const now = Date.now()

  const lembretesRows: Array<{
    agendamento_id: string
    fire_at: string
    channel: 'app' | 'whatsapp'
    target: string | null
    payload: Record<string, unknown>
  }> = []

  let leadPhone: string | null = null
  if (ag.lead_id) {
    const { data: lead } = await admin
      .from('leads')
      .select('numero_whatsapp_lead, nome_lead')
      .eq('id', ag.lead_id)
      .maybeSingle()
    leadPhone = lead?.numero_whatsapp_lead ?? null
  }

  for (const min of REMINDERS_BEFORE_MIN) {
    const fireMs = startMs - min * 60_000
    if (fireMs <= now) continue

    lembretesRows.push({
      agendamento_id: id,
      fire_at: new Date(fireMs).toISOString(),
      channel: 'app',
      target: me.userId,
      payload: { kind: 'agenda', minutes_before: min, title: ag.gg_title },
    })

    if (leadPhone) {
      lembretesRows.push({
        agendamento_id: id,
        fire_at: new Date(fireMs).toISOString(),
        channel: 'whatsapp',
        target: leadPhone,
        payload: { kind: 'agenda', minutes_before: min, title: ag.gg_title },
      })
    }
  }

  if (lembretesRows.length) {
    const { error: lemErr } = await admin
      .from('agenda_lembretes')
      .insert(lembretesRows)
    if (lemErr) {
      console.warn('[agendamentos] enqueue lembretes:', lemErr.message)
    }
  }

  return { ok: true, id, lembretes_enqueued: lembretesRows.length }
})
