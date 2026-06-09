import { serverSupabaseUser } from '#supabase/server'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

type Body = {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
  userAgent?: string | null
}

export default defineEventHandler(async (event) => {
  const authUser = await serverSupabaseUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
  }

  const body = await readBody<Body>(event)
  const endpoint = body.endpoint?.trim()
  const p256dh = body.keys?.p256dh?.trim()
  const auth = body.keys?.auth?.trim()

  if (!endpoint || !p256dh || !auth) {
    throw createError({
      statusCode: 400,
      statusMessage: 'endpoint/keys ausentes.',
    })
  }

  const admin = useSupabaseAdmin()

  const { data: userRow } = await admin
    .from('users')
    .select('companie_id')
    .eq('id', authUser.id)
    .maybeSingle()

  const companyId = (userRow as { companie_id?: string | null } | null)?.companie_id ?? null

  const { error } = await admin
    .from('push_subscriptions' as never)
    .upsert(
      {
        user_id: authUser.id,
        company_id: companyId,
        endpoint,
        p256dh,
        auth,
        user_agent: body.userAgent ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    )

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Falha ao salvar subscription: ${error.message}`,
    })
  }

  return { ok: true }
})
