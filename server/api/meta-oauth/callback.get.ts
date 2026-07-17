import { assertConnectionOwnership, requireCurrentUser } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

// Callback FIXO do OAuth (Instagram Business Login). O id da conexão chega no `state`.
// O backend (/meta-oauth/exchange) faz o fluxo completo: token → /me → salva conta → assina webhook.
export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)

  const q = getQuery(event)
  const id = (q.state as string | undefined) ?? null
  if (!id) throw createError({ statusCode: 400, statusMessage: 'state (id) ausente' })
  await assertConnectionOwnership(id, user.companie_id)

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
  // Precisa ser IDÊNTICO ao redirect_uri usado no start (Instagram exige match exato).
  const redirectUri = `${origin}/api/meta-oauth/callback`

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
