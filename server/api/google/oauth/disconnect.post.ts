import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import type { Database } from '~~/types/database'
import { revokeToken } from '~~/server/utils/google-oauth'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

type Body = { integration_id?: string }

export default defineEventHandler(async (event) => {
  const authUser = await serverSupabaseUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
  }

  const supa = await serverSupabaseClient<Database>(event)
  const { data: me } = await supa
    .from('users')
    .select('id, companie_id, funcao_user')
    .eq('id', authUser.id)
    .maybeSingle()

  if (!me?.companie_id) {
    throw createError({ statusCode: 403, statusMessage: 'Sem empresa vinculada.' })
  }

  const body: Body = await readBody<Body>(event).catch(() => ({} as Body))
  const admin = useSupabaseAdmin()
  const isOwner = me.funcao_user === 'OWNER'

  const query = admin
    .from('google_integrations')
    .select('id, user_id, refresh_token, companie_id')
    .is('revoked_at', null)

  const filtered = body.integration_id
    ? query.eq('id', body.integration_id)
    : query.eq('user_id', authUser.id)

  const { data: integs, error } = await filtered
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  if (!integs || integs.length === 0) {
    return { ok: true, revoked: 0 }
  }

  let revoked = 0
  for (const integ of integs) {
    if (integ.companie_id !== me.companie_id) continue
    if (integ.user_id !== authUser.id && !isOwner) continue

    if (integ.refresh_token) {
      await revokeToken(integ.refresh_token)
    }
    const { error: upErr } = await admin
      .from('google_integrations')
      .update({
        revoked_at: new Date().toISOString(),
        access_token: null,
      })
      .eq('id', integ.id)
    if (!upErr) revoked++
  }

  return { ok: true, revoked }
})
