import {
  DEFAULT_TZ,
  normalizeAttendees,
  parseDateTimeInput,
  requireMembership,
} from '~~/server/utils/agendamentos-helpers'
import { checkUserAvailability } from '~~/server/utils/availability-check'
import {
  getIntegrationAccessToken,
  requireUserWriteContext,
} from '~~/server/utils/google-integration'
import { insertEvent } from '~~/server/utils/google-calendar'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

type Body = {
  title?: string
  description?: string | null
  location?: string | null
  start?: string
  end?: string
  timezone?: string | null
  with_meet?: boolean
  attendees?: unknown
  lead_id?: number | null
  user_id?: string | null // atendente responsável (default = criador)
  google_calendar_id?: string | null // id google_calendars pra override do default_write
  force_outside_availability?: boolean
  send_updates?: 'all' | 'externalOnly' | 'none'
}

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  const body = await readBody<Body>(event)

  const title = body.title?.trim()
  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'title obrigatório.' })
  }

  const startIso = parseDateTimeInput(body.start ?? '', 'start')
  const endIso = parseDateTimeInput(body.end ?? '', 'end')
  if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
    throw createError({ statusCode: 400, statusMessage: 'end deve ser posterior a start.' })
  }

  const tz = body.timezone?.trim() || DEFAULT_TZ
  const attendees = normalizeAttendees(body.attendees)
  const leadId = typeof body.lead_id === 'number' ? body.lead_id : null
  const targetUserId = body.user_id ?? me.userId

  if (!body.force_outside_availability) {
    const availability = await checkUserAvailability({
      userId: targetUserId,
      companieId: me.companieId,
      startIso,
      endIso,
    })
    if (!availability.available) {
      throw createError({
        statusCode: 409,
        statusMessage: availability.reason ?? 'Horário fora da disponibilidade do atendente.',
        data: { code: 'OUTSIDE_AVAILABILITY', reason: availability.reason },
      })
    }
  }

  let accessToken: string
  let calendarRow: { id: string; gg_calendar_id: string }
  let integrationId: string

  if (body.google_calendar_id) {
    const admin0 = useSupabaseAdmin()
    const { data: chosen } = await admin0
      .from('google_calendars')
      .select('id, gg_calendar_id, integration_id, access_role, google_integrations!inner(user_id, companie_id, revoked_at)')
      .eq('id', body.google_calendar_id)
      .maybeSingle<{
        id: string
        gg_calendar_id: string
        integration_id: string
        access_role: string | null
        google_integrations: { user_id: string; companie_id: string; revoked_at: string | null }
      }>()
    if (!chosen) {
      throw createError({ statusCode: 404, statusMessage: 'Calendário escolhido não encontrado.' })
    }
    if (chosen.google_integrations.revoked_at) {
      throw createError({ statusCode: 412, statusMessage: 'Integração desconectada.' })
    }
    if (chosen.google_integrations.user_id !== targetUserId) {
      throw createError({ statusCode: 403, statusMessage: 'Calendário não pertence ao atendente escolhido.' })
    }
    if (chosen.access_role === 'reader' || chosen.access_role === 'freeBusyReader') {
      throw createError({ statusCode: 400, statusMessage: 'Calendário é somente leitura.' })
    }
    const tok = await getIntegrationAccessToken(chosen.integration_id)
    accessToken = tok.accessToken
    calendarRow = { id: chosen.id, gg_calendar_id: chosen.gg_calendar_id }
    integrationId = chosen.integration_id
  } else {
    const ctx = await requireUserWriteContext(targetUserId)
    accessToken = ctx.accessToken
    calendarRow = { id: ctx.calendar.id, gg_calendar_id: ctx.calendar.gg_calendar_id }
    integrationId = ctx.integrationId
  }

  const created = await insertEvent(accessToken, calendarRow.gg_calendar_id, {
    summary: title,
    description: body.description?.trim() || undefined,
    location: body.location?.trim() || undefined,
    start: { dateTime: startIso, timeZone: tz },
    end: { dateTime: endIso, timeZone: tz },
    attendees: attendees.map((a) => ({
      email: a.email,
      displayName: a.display_name ?? undefined,
    })),
    extendedProperties: {
      private: {
        zapifine_user_id: targetUserId,
        zapifine_companie_id: me.companieId,
        ...(leadId ? { zapifine_lead_id: String(leadId) } : {}),
      },
    },
    withMeet: body.with_meet ?? false,
    sendUpdates: body.send_updates ?? (attendees.length ? 'all' : 'none'),
  })

  const meetLink = created.hangoutLink ?? null
  const admin = useSupabaseAdmin()

  const { error: insErr } = await admin.from('agendamentos').insert({
    id: created.id,
    companie_id: me.companieId,
    user_id: targetUserId,
    lead_id: leadId,
    integration_id: integrationId,
    source_calendar_id: calendarRow.id,
    gg_title: created.summary ?? title,
    gg_start: created.start?.dateTime ?? startIso,
    gg_end: created.end?.dateTime ?? endIso,
    gg_link: created.htmlLink ?? null,
    description: created.description ?? body.description?.trim() ?? null,
    location: created.location ?? body.location?.trim() ?? null,
    meet_link: meetLink,
    status_agenda: 'Pendente',
  })

  if (insErr) {
    throw createError({
      statusCode: 500,
      statusMessage: `Evento criado no Google, mas falhou ao salvar no banco: ${insErr.message}`,
    })
  }

  if (attendees.length) {
    const rows = attendees.map((a) => ({
      agendamento_id: created.id,
      lead_id: a.lead_id ?? null,
      email: a.email,
      display_name: a.display_name ?? null,
    }))
    const { error: attErr } = await admin
      .from('agendamento_attendees')
      .insert(rows)
    if (attErr) {
      console.warn('[agendamentos] attendees insert:', attErr.message)
    }
  }

  return {
    ok: true,
    id: created.id,
    link: created.htmlLink ?? null,
    meetLink,
  }
})
