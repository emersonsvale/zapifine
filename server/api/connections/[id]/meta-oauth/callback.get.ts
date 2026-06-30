import { assertConnectionOwnership, requireCurrentUser } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id obrigatório' })
  await assertConnectionOwnership(id, user.companie_id)

  const q = getQuery(event)
  const code = (q.code as string | undefined) ?? null
  const error = (q.error as string | undefined) ?? null
  const errorDescription = (q.error_description as string | undefined) ?? null

  if (error || !code) {
    await sendRedirect(
      event,
      `/conectar?meta_oauth=error&id=${id}&reason=${encodeURIComponent(errorDescription ?? error ?? 'no_code')}`,
      302,
    )
    return
  }

  const reqHeaders = getRequestHeaders(event)
  const origin =
    process.env.NUXT_PUBLIC_SITE_URL ||
    reqHeaders.origin ||
    (reqHeaders.host ? `https://${reqHeaders.host}` : null)
  const redirectUri = `${origin}/api/connections/${id}/meta-oauth/callback`

  try {
    await callWhatsApi(event, `/connections/${id}/meta-oauth/exchange`, {
      method: 'POST',
      body: { code, redirect_uri: redirectUri },
    })
    await sendRedirect(event, `/conectar?meta_oauth=success&id=${id}`, 302)
  } catch (err) {
    const e = err as { data?: { statusMessage?: string }; message?: string }
    const msg = e.data?.statusMessage ?? e.message ?? 'exchange falhou'
    await sendRedirect(
      event,
      `/conectar?meta_oauth=error&id=${id}&reason=${encodeURIComponent(msg)}`,
      302,
    )
  }
})
