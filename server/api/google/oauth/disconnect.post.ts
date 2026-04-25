import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import type { Database } from '~~/types/database'
import { revokeToken } from '~~/server/utils/google-oauth'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await serverSupabaseUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
  }

  const supa = await serverSupabaseClient<Database>(event)
  const { data: me } = await supa
    .from('users')
    .select('companie_id, funcao_user')
    .eq('id', authUser.id)
    .maybeSingle()

  if (!me?.companie_id) {
    throw createError({ statusCode: 403, statusMessage: 'Sem empresa vinculada.' })
  }
  if (me.funcao_user !== 'OWNER') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Apenas o dono pode desconectar.',
    })
  }

  const admin = useSupabaseAdmin()
  const { data: company } = await admin
    .from('companies')
    .select('gg_refresh_token')
    .eq('id', me.companie_id)
    .maybeSingle()

  if (company?.gg_refresh_token) {
    await revokeToken(company.gg_refresh_token)
  }

  const { error } = await admin
    .from('companies')
    .update({
      gg_access_token: null,
      gg_refresh_token: null,
      gg_token_expires_at: null,
      gg_email: null,
      gg_scopes: null,
      gg_sync_token: null,
      // mantém gg_calendar_id pra reusar se reconectar mesma conta
    })
    .eq('id', me.companie_id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Falha ao desconectar: ${error.message}`,
    })
  }

  return { ok: true }
})
