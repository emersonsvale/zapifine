import { assertConnectionOwnership, requireCurrentUser } from '~~/server/utils/auth-company'

// Início do OAuth do Instagram (Instagram Business Login) — SEM Página do Facebook.
// Redireciona pra instagram.com/oauth/authorize; o id da conexão viaja no `state`.
export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id obrigatório' })
  await assertConnectionOwnership(id, user.companie_id)

  const igAppId = process.env.INSTAGRAM_APP_ID
  if (!igAppId) {
    throw createError({ statusCode: 501, statusMessage: 'INSTAGRAM_APP_ID ausente' })
  }

  const reqHeaders = getRequestHeaders(event)
  const origin =
    process.env.NUXT_PUBLIC_SITE_URL ||
    reqHeaders.origin ||
    (reqHeaders.host ? `https://${reqHeaders.host}` : null)
  if (!origin) throw createError({ statusCode: 500, statusMessage: 'origin não detectada' })

  // Callback FIXO: o Instagram valida o redirect_uri por match exato.
  // Precisa ser IGUAL ao cadastrado no painel (Login da Empresa no Instagram).
  const redirectUri = `${origin}/api/meta-oauth/callback`

  const scopes = [
    'instagram_business_basic',
    'instagram_business_manage_messages',
    'instagram_business_manage_comments',
  ]

  const url = new URL('https://www.instagram.com/oauth/authorize')
  url.searchParams.set('force_reauth', 'true')
  url.searchParams.set('client_id', igAppId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scopes.join(','))
  url.searchParams.set('state', id)

  await sendRedirect(event, url.toString(), 302)
})
