import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '~~/types/database'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

type Body = {
  email?: string
  role?: 'EMPLOYEE' | 'VIEWER'
  companieId?: string | null
  setorId?: string | null
}

export default defineEventHandler(async (event) => {
  const authUser = await serverSupabaseUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
  }

  const userClient = await serverSupabaseClient<Database>(event)
  const { data: me, error: meErr } = await userClient
    .from('users')
    .select('companie_id,funcao_user')
    .eq('id', authUser.id)
    .maybeSingle()
  if (meErr || !me) {
    throw createError({ statusCode: 403, statusMessage: 'Perfil não encontrado.' })
  }
  if (me.funcao_user !== 'OWNER') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Apenas o dono pode convidar.',
    })
  }

  const body = await readBody<Body>(event)
  const email = body.email?.trim().toLowerCase()
  const role = body.role ?? 'EMPLOYEE'
  const companieId = body.companieId ?? me.companie_id
  const setorId = body.setorId ?? null

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'E-mail inválido.' })
  }
  if (!['EMPLOYEE', 'VIEWER'].includes(role)) {
    throw createError({ statusCode: 400, statusMessage: 'Função inválida.' })
  }
  if (!companieId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Sua conta não está associada a uma empresa.',
    })
  }

  const admin = useSupabaseAdmin()

  const reqHeaders = getRequestHeaders(event)
  const origin =
    process.env.NUXT_PUBLIC_SITE_URL ||
    reqHeaders.origin ||
    (reqHeaders.host ? `https://${reqHeaders.host}` : null)
  const redirectTo = origin ? `${origin}/reset-password` : undefined

  const { data: invited, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: { companie_id: companieId, funcao_user: role },
      redirectTo,
    })

  if (inviteErr) {
    throw createError({ statusCode: 400, statusMessage: inviteErr.message })
  }

  // Trigger handle_new_user might not pick up companie_id/funcao_user from
  // metadata. Patch the row directly with service_role to be safe.
  if (invited.user?.id) {
    const { error: patchErr } = await admin
      .from('users')
      .update({
        companie_id: companieId,
        funcao_user: role,
        setor_id: setorId,
        is_onboarding_complete: true,
      } as never)
      .eq('id', invited.user.id)
    if (patchErr) {
      return {
        ok: true,
        message: `Convite enviado, mas falhou ao vincular empresa: ${patchErr.message}`,
      }
    }
  }

  return { ok: true, message: 'Convite enviado.' }
})
