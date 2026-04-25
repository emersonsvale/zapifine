import {
  DEFAULT_TZ,
  normalizeAttendees,
  parseDateTimeInput,
  requireMembership,
} from '~~/server/utils/agendamentos-helpers'
import { getCompanyAccessToken } from '~~/server/utils/google-token'
import { patchEvent } from '~~/server/utils/google-calendar'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

type Body = {
  title?: string
  description?: string | null
  location?: string | null
  start?: string
  end?: string
  timezone?: string | null
  attendees?: unknown
  lead_id?: number | null
  send_updates?: 'all' | 'externalOnly' | 'none'
}

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id obrigatório.' })
  }

  const body = await readBody<Body>(event)
  const admin = useSupabaseAdmin()

  // Verifica que o agendamento pertence à empresa do usuário
  const { data: existing, error: exErr } = await admin
    .from('agendamentos')
    .select('id, companie_id, user_id, status_agenda')
    .eq('id', id)
    .maybeSingle()

  if (exErr || !existing) {
    throw createError({ statusCode: 404, statusMessage: 'Agendamento não encontrado.' })
  }
  if (existing.companie_id !== me.companieId) {
    throw createError({ statusCode: 403, statusMessage: 'Sem permissão.' })
  }
  if (existing.status_agenda === 'Cancelado') {
    throw createError({ statusCode: 409, statusMessage: 'Agendamento cancelado não pode ser editado.' })
  }

  const tz = body.timezone?.trim() || DEFAULT_TZ
  const patch: Record<string, unknown> = {}
  const dbPatch: Record<string, unknown> = {}

  if (body.title !== undefined) {
    const t = body.title.trim()
    if (!t) throw createError({ statusCode: 400, statusMessage: 'title vazio.' })
    patch.summary = t
    dbPatch.gg_title = t
  }
  if (body.description !== undefined) {
    patch.description = body.description?.trim() || null
    dbPatch.description = body.description?.trim() || null
  }
  if (body.location !== undefined) {
    patch.location = body.location?.trim() || null
    dbPatch.location = body.location?.trim() || null
  }
  if (body.start !== undefined) {
    const startIso = parseDateTimeInput(body.start, 'start')
    patch.start = { dateTime: startIso, timeZone: tz }
    dbPatch.gg_start = startIso
  }
  if (body.end !== undefined) {
    const endIso = parseDateTimeInput(body.end, 'end')
    patch.end = { dateTime: endIso, timeZone: tz }
    dbPatch.gg_end = endIso
  }
  if (
    patch.start && patch.end
    && new Date((patch.end as { dateTime: string }).dateTime).getTime()
    <= new Date((patch.start as { dateTime: string }).dateTime).getTime()
  ) {
    throw createError({ statusCode: 400, statusMessage: 'end deve ser posterior a start.' })
  }

  let attendeesUpdated = false
  let attendees: ReturnType<typeof normalizeAttendees> = []
  if (body.attendees !== undefined) {
    attendees = normalizeAttendees(body.attendees)
    patch.attendees = attendees.map((a) => ({
      email: a.email,
      displayName: a.display_name ?? undefined,
    }))
    attendeesUpdated = true
  }
  if (body.lead_id !== undefined) {
    dbPatch.lead_id = body.lead_id
  }

  const { accessToken, calendarId } = await getCompanyAccessToken(me.companieId)
  const updated = await patchEvent(accessToken, calendarId, id, {
    summary: patch.summary as string | undefined,
    description: patch.description as string | undefined,
    location: patch.location as string | undefined,
    start: patch.start as { dateTime: string; timeZone: string } | undefined,
    end: patch.end as { dateTime: string; timeZone: string } | undefined,
    attendees: patch.attendees as Array<{ email: string; displayName?: string }> | undefined,
    sendUpdates: body.send_updates ?? 'all',
  })

  dbPatch.gg_link = updated.htmlLink ?? undefined
  dbPatch.meet_link = updated.hangoutLink ?? undefined

  if (Object.keys(dbPatch).length > 0) {
    const { error: upErr } = await admin
      .from('agendamentos')
      .update(dbPatch)
      .eq('id', id)
    if (upErr) {
      throw createError({
        statusCode: 500,
        statusMessage: `Evento atualizado no Google, mas falhou no banco: ${upErr.message}`,
      })
    }
  }

  if (attendeesUpdated) {
    await admin.from('agendamento_attendees').delete().eq('agendamento_id', id)
    if (attendees.length) {
      const rows = attendees.map((a) => ({
        agendamento_id: id,
        lead_id: a.lead_id ?? null,
        email: a.email,
        display_name: a.display_name ?? null,
      }))
      await admin.from('agendamento_attendees').insert(rows)
    }
  }

  return { ok: true, id }
})
