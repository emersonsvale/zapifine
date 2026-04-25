import { useSupabaseAdmin } from './supabase-admin'
import { getCompanyAccessToken } from './google-token'
import { listEvents, type CalendarEvent } from './google-calendar'

const PAGE_LIMIT = 10

export type SyncStats = {
  fetched: number
  upserted: number
  cancelled: number
  full_resync: boolean
  next_sync_token: string | null
}

export async function syncCompanyEvents(companyId: string): Promise<SyncStats> {
  const admin = useSupabaseAdmin()

  const { data: company } = await admin
    .from('companies')
    .select('gg_sync_token, gg_calendar_id')
    .eq('id', companyId)
    .maybeSingle()

  if (!company?.gg_calendar_id) {
    throw createError({
      statusCode: 412,
      statusMessage: 'Google Calendar não conectado.',
    })
  }

  const { accessToken, calendarId } = await getCompanyAccessToken(companyId)

  let syncToken: string | undefined = company.gg_sync_token ?? undefined
  let pageToken: string | undefined = undefined
  let nextSyncToken: string | null = null
  let fullResync = false
  let fetched = 0
  let upserted = 0
  let cancelled = 0
  const all: CalendarEvent[] = []

  for (let i = 0; i < PAGE_LIMIT; i++) {
    let res
    try {
      res = await listEvents(accessToken, calendarId, {
        syncToken: pageToken ? undefined : syncToken,
        pageToken,
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
        .eq('companie_id', companyId)
      if (!error) cancelled++
      continue
    }

    const ext = ev.extendedProperties?.private ?? {}
    const userIdFromExt = typeof ext.zapifine_user_id === 'string' ? ext.zapifine_user_id : null
    const leadIdFromExt = typeof ext.zapifine_lead_id === 'string' ? Number(ext.zapifine_lead_id) : null

    const { error } = await admin
      .from('agendamentos')
      .upsert({
        id: ev.id,
        companie_id: companyId,
        user_id: userIdFromExt,
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
    .from('companies')
    .update({
      gg_sync_token: nextSyncToken,
      gg_synced_at: new Date().toISOString(),
    })
    .eq('id', companyId)

  return {
    fetched,
    upserted,
    cancelled,
    full_resync: fullResync,
    next_sync_token: nextSyncToken,
  }
}
