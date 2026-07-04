import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'
import { requireUserWriteContext } from '~~/server/utils/google-integration'
import { insertEvent } from '~~/server/utils/google-calendar'
import { checkUserAvailability } from '~~/server/utils/availability-check'
import { renderTemplate } from '~~/server/utils/agenda-templates-render'
import { createInAppNotification } from '~~/server/utils/notifications-internal'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/

type Body = {
  user_id?: string
  start?: string  // ISO 8601
  end?: string    // ISO 8601
  timezone?: string
  guest?: {
    name?: string
    email?: string
    phone?: string
    notes?: string
  }
  title?: string  // opcional, default = "Agendamento - {nome}"
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug obrigatório.' })

  const body = await readBody<Body>(event)
  if (!body.start || !ISO_RE.test(body.start)) {
    throw createError({ statusCode: 400, statusMessage: 'start (ISO 8601) obrigatório.' })
  }
  if (!body.end || !ISO_RE.test(body.end)) {
    throw createError({ statusCode: 400, statusMessage: 'end (ISO 8601) obrigatório.' })
  }
  const guestName = body.guest?.name?.trim()
  const guestEmail = body.guest?.email?.trim().toLowerCase()
  const guestPhone = body.guest?.phone?.trim()
  if (!guestName) throw createError({ statusCode: 400, statusMessage: 'Nome obrigatório.' })
  if (!guestEmail || !EMAIL_RE.test(guestEmail)) {
    throw createError({ statusCode: 400, statusMessage: 'E-mail válido obrigatório.' })
  }

  const startMs = new Date(body.start).getTime()
  const endMs = new Date(body.end).getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    throw createError({ statusCode: 400, statusMessage: 'Datas inválidas.' })
  }
  if (startMs <= Date.now()) {
    throw createError({ statusCode: 400, statusMessage: 'Slot já passou.' })
  }

  const admin = useSupabaseAdmin()
  const { data: company } = await admin
    .from('companies')
    .select('id, name, agenda_publico_ativo')
    .eq('agenda_publico_slug', slug)
    .maybeSingle()

  if (!company || !company.agenda_publico_ativo) {
    throw createError({ statusCode: 404, statusMessage: 'Agenda pública não encontrada.' })
  }

  // Resolve user_id: se vier null, escolhe primeiro atendente disponível no slot
  let resolvedUserId: string | null = body.user_id ?? null
  if (resolvedUserId) {
    const { data: targetUser } = await admin
      .from('users')
      .select('id, companie_id, nome')
      .eq('id', resolvedUserId)
      .maybeSingle()
    if (!targetUser || targetUser.companie_id !== company.id) {
      throw createError({ statusCode: 404, statusMessage: 'Atendente não encontrado.' })
    }
    const availability = await checkUserAvailability({
      userId: resolvedUserId,
      companieId: company.id,
      startIso: body.start,
      endIso: body.end,
    })
    if (!availability.available) {
      throw createError({
        statusCode: 409,
        statusMessage: availability.reason ?? 'Slot indisponível.',
      })
    }
  } else {
    type UserLite = { id: string; agenda_horarios_semanal: { id: number }[] }
    const { data: members } = await admin
      .from('users')
      .select('id, agenda_horarios_semanal!inner(id)')
      .eq('companie_id', company.id)
      .neq('status', 'Desativado')
      .returns<UserLite[]>()

    const candidates = Array.from(new Set((members ?? []).map(m => m.id)))
    for (const uid of candidates) {
      const av = await checkUserAvailability({
        userId: uid,
        companieId: company.id,
        startIso: body.start,
        endIso: body.end,
      })
      if (av.available) {
        resolvedUserId = uid
        break
      }
    }
    if (!resolvedUserId) {
      throw createError({ statusCode: 409, statusMessage: 'Nenhum atendente disponível neste horário.' })
    }
  }
  const finalUserId: string = resolvedUserId!

  const tz = body.timezone?.trim() || 'America/Sao_Paulo'
  const title = body.title?.trim() || `Agendamento - ${guestName}`

  // Tenta vincular a um lead existente da empresa (mesmo email ou phone)
  let leadId: number | null = null
  if (guestEmail || guestPhone) {
    let q = admin
      .from('leads')
      .select('id')
      .eq('companies_id', company.id)
      .limit(1)
    if (guestEmail) q = q.eq('e-mail', guestEmail)
    const { data: lead } = await q.maybeSingle()
    leadId = (lead as { id: number } | null)?.id ?? null
  }

  const { accessToken, calendar, integrationId } = await requireUserWriteContext(finalUserId)

  const created = await insertEvent(accessToken, calendar.gg_calendar_id, {
    summary: title,
    description: body.guest?.notes?.trim() || `Agendado via página pública.\nNome: ${guestName}\nE-mail: ${guestEmail}${guestPhone ? `\nTelefone: ${guestPhone}` : ''}`,
    start: { dateTime: body.start, timeZone: tz },
    end: { dateTime: body.end, timeZone: tz },
    attendees: [{ email: guestEmail, displayName: guestName }],
    extendedProperties: {
      private: {
        zapifine_user_id: finalUserId,
        zapifine_companie_id: company.id,
        zapifine_source: 'public_booking',
        ...(leadId ? { zapifine_lead_id: String(leadId) } : {}),
      },
    },
    sendUpdates: 'all',
  })

  const { error: insErr } = await admin.from('agendamentos').insert({
    id: created.id,
    companie_id: company.id,
    user_id: finalUserId,
    lead_id: leadId,
    integration_id: integrationId,
    source_calendar_id: calendar.id,
    gg_title: title,
    gg_start: body.start,
    gg_end: body.end,
    gg_link: created.htmlLink ?? null,
    description: created.description ?? null,
    location: created.location ?? null,
    meet_link: created.hangoutLink ?? null,
    status_agenda: 'Pendente',
  })

  if (insErr) {
    throw createError({
      statusCode: 500,
      statusMessage: `Evento criado no Google, mas falhou ao salvar: ${insErr.message}`,
    })
  }

  await admin.from('agendamento_attendees').insert({
    agendamento_id: created.id,
    lead_id: leadId,
    email: guestEmail,
    display_name: guestName,
  })

  // Notifica atendente in-app
  try {
    const { title: nTitle, body: nBody } = await renderTemplate({
      companyId: company.id,
      channel: 'app',
      kind: 'novo_agendamento',
      ctx: {
        title,
        when: new Date(body.start).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo',
        }),
        lead_name: guestName,
        empresa: company.name,
      },
    })
    await createInAppNotification({
      userId: finalUserId,
      companyId: company.id,
      title: nTitle,
      message: nBody,
      tipo: 'agenda',
      referenceType: 'agendamento',
    })
  } catch (err) {
    console.warn('[public booking] notif:', err)
  }

  return {
    ok: true,
    id: created.id,
    link: created.htmlLink ?? null,
    when: body.start,
  }
})
