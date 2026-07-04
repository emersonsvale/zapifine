import { randomBytes } from 'node:crypto'
import { useSupabaseAdmin } from './supabase-admin'
import { getIntegrationAccessToken } from './google-integration'
import { startWatch, stopWatch } from './google-calendar'

const WATCH_TTL_SECONDS = 7 * 24 * 3600 // Google max ~= 7 dias pra calendar events

function getAppBaseUrl(): string {
  return (process.env.APP_BASE_URL ?? process.env.NUXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
}

export async function registerCalendarWatch(calendarId: string): Promise<void> {
  const admin = useSupabaseAdmin()
  const { data: cal } = await admin
    .from('google_calendars')
    .select('id, integration_id, gg_calendar_id, access_role, selected, watch_channel_id, watch_resource_id')
    .eq('id', calendarId)
    .maybeSingle()

  if (!cal || !cal.selected) return
  if (cal.access_role !== 'owner' && cal.access_role !== 'writer') return

  const baseUrl = getAppBaseUrl()
  if (!baseUrl) return

  const { accessToken } = await getIntegrationAccessToken(cal.integration_id)

  // Encerra watch anterior (se existir)
  if (cal.watch_channel_id && cal.watch_resource_id) {
    await stopWatch(accessToken, cal.watch_channel_id, cal.watch_resource_id).catch(() => {})
  }

  const channelId = `zap-${cal.id}-${Date.now()}`
  const token = randomBytes(16).toString('hex')

  const res = await startWatch(accessToken, cal.gg_calendar_id, {
    id: channelId,
    address: `${baseUrl}/api/google/webhook`,
    token,
    ttl: WATCH_TTL_SECONDS,
  })

  const expiresAt = res.expiration
    ? new Date(Number(res.expiration)).toISOString()
    : new Date(Date.now() + WATCH_TTL_SECONDS * 1000).toISOString()

  await admin
    .from('google_calendars')
    .update({
      watch_channel_id: res.id,
      watch_resource_id: res.resourceId,
      watch_token: token,
      watch_expires_at: expiresAt,
    })
    .eq('id', cal.id)
}

export async function unregisterCalendarWatch(calendarId: string): Promise<void> {
  const admin = useSupabaseAdmin()
  const { data: cal } = await admin
    .from('google_calendars')
    .select('id, integration_id, watch_channel_id, watch_resource_id')
    .eq('id', calendarId)
    .maybeSingle()
  if (!cal?.watch_channel_id || !cal.watch_resource_id) return

  try {
    const { accessToken } = await getIntegrationAccessToken(cal.integration_id)
    await stopWatch(accessToken, cal.watch_channel_id, cal.watch_resource_id)
  } catch (err) {
    console.warn('[google-watch] stop fail:', err)
  }

  await admin
    .from('google_calendars')
    .update({
      watch_channel_id: null,
      watch_resource_id: null,
      watch_token: null,
      watch_expires_at: null,
    })
    .eq('id', cal.id)
}

export async function findCalendarByChannel(channelId: string, token: string) {
  const admin = useSupabaseAdmin()
  const { data } = await admin
    .from('google_calendars')
    .select('id, integration_id, gg_calendar_id, watch_token')
    .eq('watch_channel_id', channelId)
    .maybeSingle()
  if (!data) return null
  if (data.watch_token !== token) return null
  return data
}
