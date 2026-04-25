import {
  exchangeCode,
  fetchUserInfo,
  GOOGLE_OAUTH_SCOPES,
  verifyState,
} from '~~/server/utils/google-oauth'
import { createCalendar, getCalendar } from '~~/server/utils/google-calendar'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

function safeRedirectPath(input: string | undefined): string {
  if (!input) return '/agendas'
  if (!input.startsWith('/') || input.startsWith('//')) return '/agendas'
  return input
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
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

  const tokens = await exchangeCode({
    clientId: config.googleClientId as string,
    clientSecret: config.googleClientSecret as string,
    redirectUri: config.googleRedirectUri as string,
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

  // Pega calendar atual da empresa (se existir, valida; senão cria)
  const { data: company, error: cErr } = await admin
    .from('companies')
    .select('id, name, gg_calendar_id')
    .eq('id', parsed.companie_id)
    .maybeSingle()

  if (cErr || !company) {
    throw createError({ statusCode: 404, statusMessage: 'Empresa não encontrada.' })
  }

  let calendarId = company.gg_calendar_id ?? null
  if (calendarId) {
    // Valida que ainda existe (usuário pode ter deletado no Google)
    try {
      await getCalendar(tokens.access_token, calendarId)
    } catch {
      calendarId = null
    }
  }
  if (!calendarId) {
    const created = await createCalendar(tokens.access_token, {
      summary: `Zapifine - ${company.name}`,
      timeZone: 'America/Sao_Paulo',
      description: 'Agendamentos sincronizados pelo Zapifine.',
    })
    calendarId = created.id
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const { error: upErr } = await admin
    .from('companies')
    .update({
      gg_access_token: tokens.access_token,
      gg_refresh_token: tokens.refresh_token,
      gg_token_expires_at: expiresAt,
      gg_calendar_id: calendarId,
      gg_email: userInfo?.email ?? null,
      gg_scopes: tokens.scope ? tokens.scope.split(' ') : GOOGLE_OAUTH_SCOPES,
    })
    .eq('id', parsed.companie_id)

  if (upErr) {
    throw createError({
      statusCode: 500,
      statusMessage: `Falha ao salvar tokens: ${upErr.message}`,
    })
  }

  await sendRedirect(event, `${redirectTo}?google=connected`, 302)
})
