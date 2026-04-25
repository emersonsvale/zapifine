import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'
import { getCompanyAccessToken } from '~~/server/utils/google-token'
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
  if (!body.user_id) throw createError({ statusCode: 400, statusMessage: 'user_id obrigatório.' })
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
    .select('id, name, agenda_publico_ativo, gg_calendar_id, gg_refresh_token')
    .eq('agenda_publico_slug', slug)
    .maybeSingle()

  if (!company || !company.agenda_publico_ativo) {
    throw createError({ statusCode: 404, statusMessage: 'Agenda pública não encontrada.' })
  }
  if (!company.gg_calendar_id || !company.gg_refresh_token) {
    throw createError({ statusCode: 412, statusMessage: 'Empresa sem Google Calendar conectado.' })
  }

  // Confirma user pertence à empresa
  const { data: targetUser } = await admin
    .from('users')
    .select('id, companie_id, nome')
    .eq('id', body.user_id)
    .maybeSingle()
  if (!targetUser || targetUser.companie_id !== company.id) {
    throw createError({ statusCode: 404, statusMessage: 'Atendente não encontrado.' })
  }

  // Valida disponibilidade
  const availability = await checkUserAvailability({
    userId: body.user_id,
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

  const { accessToken, calendarId } = await getCompanyAccessToken(company.id)

  const created = await insertEvent(accessToken, calendarId, {
    summary: title,
    description: body.guest?.notes?.trim() || `Agendado via página pública.\nNome: ${guestName}\nE-mail: ${guestEmail}${guestPhone ? `\nTelefone: ${guestPhone}` : ''}`,
    start: { dateTime: body.start, timeZone: tz },
    end: { dateTime: body.end, timeZone: tz },
    attendees: [{ email: guestEmail, displayName: guestName }],
    extendedProperties: {
      private: {
        zapifine_user_id: body.user_id,
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
    user_id: body.user_id,
    lead_id: leadId,
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
      userId: body.user_id,
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
