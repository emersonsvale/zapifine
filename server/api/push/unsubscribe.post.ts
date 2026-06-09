import { serverSupabaseUser } from '#supabase/server'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

type Body = { endpoint?: string }

export default defineEventHandler(async (event) => {
  const authUser = await serverSupabaseUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
  }

  const body = await readBody<Body>(event)
  const endpoint = body.endpoint?.trim()
  if (!endpoint) {
    throw createError({ statusCode: 400, statusMessage: 'endpoint ausente.' })
  }

  const admin = useSupabaseAdmin()
  const { error } = await admin
    .from('push_subscriptions' as never)
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', authUser.id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Falha ao remover subscription: ${error.message}`,
    })
  }

  return { ok: true }
})
