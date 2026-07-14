import { assertConnectionOwnership, requireCurrentUser } from '~~/server/utils/auth-company'

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id obrigatório' })
  await assertConnectionOwnership(id, user.companie_id)

  const config = useRuntimeConfig(event)
  const appId = config.public.metaAppId as string
  const graphVersion = (config.public.metaGraphVersion as string) || 'v20.0'
  if (!appId) {
    throw createError({ statusCode: 501, statusMessage: 'META_APP_ID ausente' })
  }

  const reqHeaders = getRequestHeaders(event)
  const origin =
    process.env.NUXT_PUBLIC_SITE_URL ||
    reqHeaders.origin ||
    (reqHeaders.host ? `https://${reqHeaders.host}` : null)
  if (!origin) throw createError({ statusCode: 500, statusMessage: 'origin não detectada' })

  // Callback FIXO: o Facebook valida o redirect_uri por match exato (strict mode),
  // então não dá pra ter o id no caminho. O id viaja no `state` e é lido no callback.
  const redirectUri = `${origin}/api/meta-oauth/callback`

  const scopes = [
    'email',
    'pages_show_list',
    'pages_manage_metadata',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_manage_messages',
    'instagram_manage_comments',
  ]

  const url = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`)
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', scopes.join(','))
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', id)

  await sendRedirect(event, url.toString(), 302)
})
