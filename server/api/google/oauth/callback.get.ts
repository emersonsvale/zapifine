import {
  exchangeCode,
  fetchUserInfo,
  GOOGLE_OAUTH_SCOPES,
  verifyState,
} from '~~/server/utils/google-oauth'
import { listCalendarList } from '~~/server/utils/google-calendar'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

function safeRedirectPath(input: string | undefined): string {
  if (!input) return '/agendas'
  if (!input.startsWith('/') || input.startsWith('//')) return '/agendas'
  return input
}

export default defineEventHandler(async (event) => {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? ''
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI
    ?? 'http://localhost:3000/api/google/oauth/callback'
  const query = getQuery(event)

  const error = query.error as string | undefined
  const code = query.code as string | undefined
  const state = query.state as string | undefined

  if (error) {
    await sendRedirect(
      event,
      `/agendas?google=error&reason=${encodeURIComponent(error)}`,
      302,
    )
    return
  }
  if (!code || !state) {
    throw createError({ statusCode: 400, statusMessage: 'code/state ausentes.' })
  }

  const parsed = verifyState(state)
  const redirectTo = safeRedirectPath(parsed.redirect_to)

  if (!clientId || !clientSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET ausentes no .env.',
    })
  }

  const tokens = await exchangeCode({
    clientId,
    clientSecret,
    redirectUri,
    code,
  }).catch((err) => {
    const e = err as { data?: { error_description?: string }; message?: string }
    throw createError({
      statusCode: 502,
      statusMessage: `Falha ao trocar code: ${e.data?.error_description ?? e.message ?? 'erro'}`,
    })
  })

  if (!tokens.refresh_token) {
    throw createError({
      statusCode: 502,
      statusMessage:
        'Google não retornou refresh_token. Revogue o acesso em myaccount.google.com e tente novamente.',
    })
  }

  const userInfo = await fetchUserInfo(tokens.access_token).catch(() => null)
  const admin = useSupabaseAdmin()

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // Upsert integration: (user_id, gg_email) UNIQUE onde revoked_at null
  const emailKey = userInfo?.email?.toLowerCase() ?? null

  let integrationId: string | null = null
  if (emailKey) {
    const { data: existing } = await admin
      .from('google_integrations')
      .select('id')
      .eq('user_id', parsed.user_id)
      .eq('gg_email', emailKey)
      .is('revoked_at', null)
      .maybeSingle()
    if (existing?.id) integrationId = existing.id
  }

  if (integrationId) {
    const { error: upErr } = await admin
      .from('google_integrations')
      .update({
        companie_id: parsed.companie_id,
        gg_sub: userInfo?.sub ?? null,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        scopes: tokens.scope ? tokens.scope.split(' ') : GOOGLE_OAUTH_SCOPES,
        revoked_at: null,
      })
      .eq('id', integrationId)
    if (upErr) {
      throw createError({ statusCode: 500, statusMessage: `Falha update integration: ${upErr.message}` })
    }
  } else {
    const { data: inserted, error: insErr } = await admin
      .from('google_integrations')
      .insert({
        user_id: parsed.user_id,
        companie_id: parsed.companie_id,
        gg_email: emailKey,
        gg_sub: userInfo?.sub ?? null,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        scopes: tokens.scope ? tokens.scope.split(' ') : GOOGLE_OAUTH_SCOPES,
      })
      .select('id')
      .maybeSingle()
    if (insErr || !inserted?.id) {
      throw createError({ statusCode: 500, statusMessage: `Falha insert integration: ${insErr?.message ?? 'nulo'}` })
    }
    integrationId = inserted.id
  }

  // Popula google_calendars via calendarList
  const calList = await listCalendarList(tokens.access_token).catch(() => [])

  // Descobre se já tem default_write pra essa integration
  const { data: hasDefault } = await admin
    .from('google_calendars')
    .select('id')
    .eq('integration_id', integrationId)
    .eq('default_write', true)
    .maybeSingle()

  for (const c of calList) {
    if (c.deleted) continue
    const readonly = c.accessRole === 'reader' || c.accessRole === 'freeBusyReader'
    if (readonly) continue
    const row = {
      integration_id: integrationId,
      gg_calendar_id: c.id,
      summary: c.summaryOverride ?? c.summary ?? null,
      description: c.description ?? null,
      time_zone: c.timeZone ?? null,
      primary_flag: !!c.primary,
      access_role: c.accessRole ?? null,
      color_hex: c.backgroundColor ?? null,
      // preserva selected/default_write se linha já existe (usa onConflict)
    }
    await admin
      .from('google_calendars')
      .upsert(row, { onConflict: 'integration_id,gg_calendar_id', ignoreDuplicates: false })

    // Se não tem default_write e este é primary + gravável → marca
    if (!hasDefault && c.primary && !readonly) {
      await admin
        .from('google_calendars')
        .update({ default_write: true })
        .eq('integration_id', integrationId)
        .eq('gg_calendar_id', c.id)
    }
  }

  await sendRedirect(event, `${redirectTo}?google=connected`, 302)
})
