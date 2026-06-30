import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'
import { sendWhatsappText } from '~~/server/utils/evolution'
import { createInAppNotification } from '~~/server/utils/notifications-internal'
import { renderTemplate } from '~~/server/utils/agenda-templates-render'

const MAX_BATCH = 100
const MAX_ATTEMPTS = 3

type LembreteRow = {
  id: string
  agendamento_id: string
  fire_at: string
  channel: 'app' | 'whatsapp'
  target: string | null
  payload: Record<string, unknown> | null
  attempts: number
  whatsapp_connection_id: string | null
}

type AgendamentoLite = {
  id: string
  companie_id: string | null
  user_id: string | null
  gg_title: string | null
  gg_start: string | null
  gg_link: string | null
  meet_link: string | null
  status_agenda: string | null
}

function fmtDateTimeBR(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })
  } catch {
    return iso
  }
}

function buildContext(ag: AgendamentoLite, minutesBefore: number) {
  return {
    title: ag.gg_title ?? 'Agendamento',
    when: fmtDateTimeBR(ag.gg_start),
    minutes_before: minutesBefore,
    link: ag.gg_link ?? null,
    meet_link: ag.meet_link ?? null,
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const expected = config.cronSecret as string
  if (!expected) {
    throw createError({
      statusCode: 503,
      statusMessage: 'CRON_SECRET ausente no .env.',
    })
  }

  const got =
    getHeader(event, 'x-cron-secret')
    ?? (getHeader(event, 'authorization')?.replace(/^Bearer\s+/i, '') ?? '')

  if (got !== expected) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado.' })
  }

  const admin = useSupabaseAdmin()
  const nowIso = new Date().toISOString()

  const { data: pending, error: pErr } = await admin
    .from('agenda_lembretes')
    .select('id, agendamento_id, fire_at, channel, target, payload, attempts, whatsapp_connection_id')
    .eq('status', 'pending')
    .lte('fire_at', nowIso)
    .order('fire_at', { ascending: true })
    .limit(MAX_BATCH)
    .returns<LembreteRow[]>()

  if (pErr) {
    throw createError({ statusCode: 500, statusMessage: pErr.message })
  }
  if (!pending?.length) {
    return { ok: true, processed: 0, sent: 0, failed: 0 }
  }

  // Pré-fetch dos agendamentos relacionados (em batch)
  const agIds = Array.from(new Set(pending.map((p: LembreteRow) => p.agendamento_id)))
  const { data: agendamentos } = await admin
    .from('agendamentos')
    .select('id, companie_id, user_id, gg_title, gg_start, gg_link, meet_link, status_agenda')
    .in('id', agIds)
    .returns<AgendamentoLite[]>()

  const agMap = new Map<string, AgendamentoLite>(
    (agendamentos ?? []).map((a: AgendamentoLite) => [a.id, a]),
  )

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const lem of pending) {
    const ag = agMap.get(lem.agendamento_id)
    if (!ag || ag.status_agenda === 'Cancelado' || !ag.companie_id) {
      await admin
        .from('agenda_lembretes')
        .update({ status: 'skipped', sent_at: nowIso })
        .eq('id', lem.id)
      skipped++
      continue
    }

    const minutesBefore = Number(
      (lem.payload as Record<string, unknown> | null)?.minutes_before ?? 0,
    )

    try {
      const ctx = buildContext(ag, minutesBefore)
      if (lem.channel === 'app') {
        if (!lem.target) throw new Error('target (user_id) ausente.')
        const { title, body } = await renderTemplate({
          companyId: ag.companie_id,
          channel: 'app',
          kind: 'lembrete',
          minutesBefore,
          ctx,
        })
        await createInAppNotification({
          userId: lem.target,
          companyId: ag.companie_id,
          title,
          message: body,
          tipo: 'agenda',
          referenceId: null,
          referenceType: 'agendamento',
        })
      } else if (lem.channel === 'whatsapp') {
        if (!lem.target) throw new Error('target (whatsapp number) ausente.')
        const { body } = await renderTemplate({
          companyId: ag.companie_id,
          channel: 'whatsapp',
          kind: 'lembrete',
          minutesBefore,
          ctx,
        })
        await sendWhatsappText({
          companyId: ag.companie_id,
          connectionId: lem.whatsapp_connection_id ?? undefined,
          to: lem.target,
          text: body,
        })
      } else {
        throw new Error(`channel desconhecido: ${lem.channel}`)
      }

      await admin
        .from('agenda_lembretes')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          attempts: lem.attempts + 1,
        })
        .eq('id', lem.id)
      sent++
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.'
      const newAttempts = lem.attempts + 1
      const isFinal = newAttempts >= MAX_ATTEMPTS
      await admin
        .from('agenda_lembretes')
        .update({
          status: isFinal ? 'failed' : 'pending',
          attempts: newAttempts,
          last_error: msg.slice(0, 500),
        })
        .eq('id', lem.id)
      failed++
    }
  }

  return {
    ok: true,
    processed: pending.length,
    sent,
    failed,
    skipped,
  }
})
