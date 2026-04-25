import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import type { Database } from '~~/types/database'
import { buildAuthUrl, signState } from '~~/server/utils/google-oauth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const clientId = config.googleClientId as string
  const redirectUri = config.googleRedirectUri as string

  if (!clientId || !redirectUri) {
    throw createError({
      statusCode: 500,
      statusMessage: 'GOOGLE_CLIENT_ID/GOOGLE_REDIRECT_URI ausentes no .env.',
    })
  }

  const authUser = await serverSupabaseUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
  }

  const supa = await serverSupabaseClient<Database>(event)
  const { data: me, error: meErr } = await supa
    .from('users')
    .select('companie_id, funcao_user, email')
    .eq('id', authUser.id)
    .maybeSingle()

  if (meErr || !me?.companie_id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Sua conta não está vinculada a uma empresa.',
    })
  }
  if (me.funcao_user !== 'OWNER') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Apenas o dono pode conectar o Google Calendar.',
    })
  }

  const query = getQuery(event)
  const redirectTo = typeof query.redirect_to === 'string' ? query.redirect_to : '/agendas'

  const state = signState({
    user_id: authUser.id,
    companie_id: me.companie_id,
    redirect_to: redirectTo,
  })

  const url = buildAuthUrl({
    clientId,
    redirectUri,
    state,
    loginHint: me.email ?? authUser.email,
  })

  await sendRedirect(event, url, 302)
})
