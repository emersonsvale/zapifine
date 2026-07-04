import { useSupabaseAdmin } from './supabase-admin'
import { refreshAccessToken } from './google-oauth'

const REFRESH_BUFFER_SEC = 60

export type IntegrationRow = {
  id: string
  user_id: string
  companie_id: string
  gg_email: string | null
  access_token: string | null
  refresh_token: string
  token_expires_at: string | null
  revoked_at: string | null
}

export type CalendarRow = {
  id: string
  integration_id: string
  gg_calendar_id: string
  summary: string | null
  time_zone: string | null
  primary_flag: boolean
  access_role: string | null
  selected: boolean
  default_write: boolean
  sync_token: string | null
  synced_at: string | null
}

export async function getIntegrationAccessToken(
  integrationId: string,
): Promise<{ accessToken: string; integration: IntegrationRow }> {
  const admin = useSupabaseAdmin()
  const { data, error } = await admin
    .from('google_integrations')
    .select('id, user_id, companie_id, gg_email, access_token, refresh_token, token_expires_at, revoked_at')
    .eq('id', integrationId)
    .maybeSingle<IntegrationRow>()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Integração Google não encontrada.' })
  }
  if (data.revoked_at) {
    throw createError({ statusCode: 412, statusMessage: 'Integração Google desconectada.' })
  }

  const now = Math.floor(Date.now() / 1000)
  const expiresAt = data.token_expires_at
    ? Math.floor(new Date(data.token_expires_at).getTime() / 1000)
    : 0

  if (data.access_token && expiresAt - now > REFRESH_BUFFER_SEC) {
    return { accessToken: data.access_token, integration: data }
  }

  const clientId = process.env.GOOGLE_CLIENT_ID ?? ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? ''
  if (!clientId || !clientSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET ausentes no .env.',
    })
  }
  const refreshed = await refreshAccessToken({
    clientId,
    clientSecret,
    refreshToken: data.refresh_token,
  }).catch((err) => {
    const e = err as { data?: { error_description?: string; error?: string }; message?: string }
    const desc = e.data?.error_description ?? e.message ?? 'erro desconhecido'
    if (e.data?.error === 'invalid_grant') {
      // refresh_token revogado pelo user no Google
      admin
        .from('google_integrations')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', integrationId)
        .then(() => {})
    }
    throw createError({
      statusCode: 502,
      statusMessage: `Falha ao renovar token Google: ${desc}`,
    })
  })

  const newExpiresAt = new Date((now + refreshed.expires_in) * 1000).toISOString()

  await admin
    .from('google_integrations')
    .update({ access_token: refreshed.access_token, token_expires_at: newExpiresAt })
    .eq('id', integrationId)

  return {
    accessToken: refreshed.access_token,
    integration: {
      ...data,
      access_token: refreshed.access_token,
      token_expires_at: newExpiresAt,
    },
  }
}

export async function getUserActiveIntegration(userId: string): Promise<IntegrationRow | null> {
  const admin = useSupabaseAdmin()
  const { data } = await admin
    .from('google_integrations')
    .select('id, user_id, companie_id, gg_email, access_token, refresh_token, token_expires_at, revoked_at')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<IntegrationRow>()
  return data ?? null
}

export async function getDefaultWriteCalendar(integrationId: string): Promise<CalendarRow | null> {
  const admin = useSupabaseAdmin()
  const { data: dw } = await admin
    .from('google_calendars')
    .select('id, integration_id, gg_calendar_id, summary, time_zone, primary_flag, access_role, selected, default_write, sync_token, synced_at')
    .eq('integration_id', integrationId)
    .eq('default_write', true)
    .maybeSingle<CalendarRow>()
  if (dw) return dw

  // Fallback: primary
  const { data: pri } = await admin
    .from('google_calendars')
    .select('id, integration_id, gg_calendar_id, summary, time_zone, primary_flag, access_role, selected, default_write, sync_token, synced_at')
    .eq('integration_id', integrationId)
    .eq('primary_flag', true)
    .maybeSingle<CalendarRow>()
  return pri ?? null
}

export type WriteContext = {
  integrationId: string
  accessToken: string
  calendar: CalendarRow
}

export async function requireUserWriteContext(userId: string): Promise<WriteContext> {
  const integ = await getUserActiveIntegration(userId)
  if (!integ) {
    throw createError({
      statusCode: 412,
      statusMessage: 'Google Calendar não conectado. Conecte em /agendas.',
    })
  }
  const cal = await getDefaultWriteCalendar(integ.id)
  if (!cal) {
    throw createError({
      statusCode: 412,
      statusMessage: 'Nenhum calendário disponível. Reconecte o Google.',
    })
  }
  const { accessToken } = await getIntegrationAccessToken(integ.id)
  return { integrationId: integ.id, accessToken, calendar: cal }
}

export async function listSelectedCalendars(integrationId: string): Promise<CalendarRow[]> {
  const admin = useSupabaseAdmin()
  const { data } = await admin
    .from('google_calendars')
    .select('id, integration_id, gg_calendar_id, summary, time_zone, primary_flag, access_role, selected, default_write, sync_token, synced_at')
    .eq('integration_id', integrationId)
    .eq('selected', true)
  return (data as CalendarRow[]) ?? []
}
