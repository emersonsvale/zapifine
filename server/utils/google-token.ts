import { useSupabaseAdmin } from './supabase-admin'
import { refreshAccessToken } from './google-oauth'

const REFRESH_BUFFER_SEC = 60

type CompanyTokenRow = {
  id: string
  gg_access_token: string | null
  gg_refresh_token: string | null
  gg_token_expires_at: string | null
  gg_calendar_id: string | null
}

export async function getCompanyAccessToken(companyId: string): Promise<{
  accessToken: string
  calendarId: string
}> {
  const admin = useSupabaseAdmin()
  const { data, error } = await admin
    .from('companies')
    .select('id, gg_access_token, gg_refresh_token, gg_token_expires_at, gg_calendar_id')
    .eq('id', companyId)
    .maybeSingle<CompanyTokenRow>()

  if (error || !data) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Empresa não encontrada.',
    })
  }
  if (!data.gg_refresh_token) {
    throw createError({
      statusCode: 412,
      statusMessage: 'Google Calendar não conectado.',
    })
  }
  if (!data.gg_calendar_id) {
    throw createError({
      statusCode: 412,
      statusMessage: 'gg_calendar_id ausente. Reconecte o Google Calendar.',
    })
  }

  const now = Math.floor(Date.now() / 1000)
  const expiresAt = data.gg_token_expires_at
    ? Math.floor(new Date(data.gg_token_expires_at).getTime() / 1000)
    : 0

  if (data.gg_access_token && expiresAt - now > REFRESH_BUFFER_SEC) {
    return { accessToken: data.gg_access_token, calendarId: data.gg_calendar_id }
  }

  const config = useRuntimeConfig()
  const refreshed = await refreshAccessToken({
    clientId: config.googleClientId as string,
    clientSecret: config.googleClientSecret as string,
    refreshToken: data.gg_refresh_token,
  }).catch((err) => {
    const e = err as { data?: { error_description?: string }; message?: string }
    throw createError({
      statusCode: 502,
      statusMessage: `Falha ao renovar token Google: ${e.data?.error_description ?? e.message ?? 'erro desconhecido'}`,
    })
  })

  const newExpiresAt = new Date(
    (now + refreshed.expires_in) * 1000,
  ).toISOString()

  await admin
    .from('companies')
    .update({
      gg_access_token: refreshed.access_token,
      gg_token_expires_at: newExpiresAt,
    })
    .eq('id', companyId)

  return { accessToken: refreshed.access_token, calendarId: data.gg_calendar_id }
}
