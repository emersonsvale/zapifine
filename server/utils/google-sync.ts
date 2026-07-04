import { useSupabaseAdmin } from './supabase-admin'
import { getIntegrationAccessToken, listSelectedCalendars, type CalendarRow } from './google-integration'
import { listEvents, type CalendarEvent } from './google-calendar'

const PAGE_LIMIT = 10
const INITIAL_WINDOW_DAYS = 30 // sync inicial: só últimos 30d + futuros

export type CalendarSyncStats = {
  calendar_id: string
  gg_calendar_id: string
  fetched: number
  upserted: number
  cancelled: number
  full_resync: boolean
}

export type IntegrationSyncStats = {
  integration_id: string
  calendars: CalendarSyncStats[]
}

async function syncOneCalendar(params: {
  accessToken: string
  integrationId: string
  companieId: string
  userId: string
  calendar: CalendarRow
}): Promise<CalendarSyncStats> {
  const admin = useSupabaseAdmin()
  const { accessToken, integrationId, companieId, userId, calendar } = params

  let syncToken: string | undefined = calendar.sync_token ?? undefined
  let pageToken: string | undefined = undefined
  let nextSyncToken: string | null = null
  let fullResync = false
  let fetched = 0
  let upserted = 0
  let cancelled = 0
  const all: CalendarEvent[] = []

  // Sync inicial (sem sync_token) usa janela temporal pra evitar puxar histórico completo.
  // Sync incremental (com sync_token) NÃO aceita timeMin — usa delta.
  const isInitial = !syncToken
  const timeMin = isInitial
    ? new Date(Date.now() - INITIAL_WINDOW_DAYS * 24 * 3600 * 1000).toISOString()
    : undefined

  for (let i = 0; i < PAGE_LIMIT; i++) {
    let res
    try {
      res = await listEvents(accessToken, calendar.gg_calendar_id, {
        syncToken: pageToken ? undefined : syncToken,
        pageToken,
        timeMin: syncToken ? undefined : timeMin,
        showDeleted: true,
        singleEvents: true,
        maxResults: 250,
      })
    } catch (err) {
      const e = err as { statusCode?: number }
      if (e.statusCode === 410 && syncToken) {
        syncToken = undefined
        pageToken = undefined
        fullResync = true
        i--
        continue
      }
      throw err
    }

    fetched += res.items.length
    all.push(...res.items)

    if (res.nextPageToken) {
      pageToken = res.nextPageToken
      continue
    }
    nextSyncToken = res.nextSyncToken ?? null
    break
  }

  for (const ev of all) {
    if (!ev.id) continue

    if (ev.status === 'cancelled') {
      const { error } = await admin
        .from('agendamentos')
        .update({ status_agenda: 'Cancelado' })
        .eq('id', ev.id)
        .eq('companie_id', companieId)
      if (!error) cancelled++
      continue
    }

    const ext = ev.extendedProperties?.private ?? {}
    const userIdFromExt = typeof ext.zapifine_user_id === 'string' ? ext.zapifine_user_id : userId
    const leadIdFromExt = typeof ext.zapifine_lead_id === 'string' ? Number(ext.zapifine_lead_id) : null

    const { error } = await admin
      .from('agendamentos')
      .upsert({
        id: ev.id,
        companie_id: companieId,
        user_id: userIdFromExt,
        integration_id: integrationId,
        source_calendar_id: calendar.id,
        lead_id: Number.isFinite(leadIdFromExt) ? leadIdFromExt : null,
        gg_title: ev.summary ?? null,
        gg_start: ev.start?.dateTime ?? (ev.start?.date ? new Date(ev.start.date).toISOString() : null),
        gg_end: ev.end?.dateTime ?? (ev.end?.date ? new Date(ev.end.date).toISOString() : null),
        gg_link: ev.htmlLink ?? null,
        description: ev.description ?? null,
        location: ev.location ?? null,
        meet_link: ev.hangoutLink ?? null,
      }, { onConflict: 'id' })

    if (!error) upserted++
  }

  await admin
    .from('google_calendars')
    .update({
      sync_token: nextSyncToken,
      synced_at: new Date().toISOString(),
    })
    .eq('id', calendar.id)

  return {
    calendar_id: calendar.id,
    gg_calendar_id: calendar.gg_calendar_id,
    fetched,
    upserted,
    cancelled,
    full_resync: fullResync,
  }
}

export async function syncIntegration(integrationId: string): Promise<IntegrationSyncStats> {
  const { accessToken, integration } = await getIntegrationAccessToken(integrationId)
  const calendars = await listSelectedCalendars(integrationId)

  const stats: CalendarSyncStats[] = []
  for (const cal of calendars) {
    try {
      const s = await syncOneCalendar({
        accessToken,
        integrationId,
        companieId: integration.companie_id,
        userId: integration.user_id,
        calendar: cal,
      })
      stats.push(s)
    } catch (err) {
      console.warn(`[google-sync] calendar ${cal.gg_calendar_id}:`, err)
    }
  }

  return { integration_id: integrationId, calendars: stats }
}
