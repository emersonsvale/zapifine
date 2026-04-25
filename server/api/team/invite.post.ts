import { createClient } from '@supabase/supabase-js'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '~~/types/database'

type Body = {
  email?: string
  role?: 'EMPLOYEE' | 'VIEWER'
  companieId?: string | null
  setorId?: string | null
}

export default defineEventHandler(async (event) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.SUPABASE_URL

  if (!serviceKey || !supabaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'SUPABASE_SERVICE_ROLE_KEY ausente no .env. Convite indisponível.',
    })
  }

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

  const admin = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const headers: Record<string, string> = {}
  if (process.env.SUPABASE_GW_SECRET) {
    headers['x-zapifine-gw'] = process.env.SUPABASE_GW_SECRET
  }
  if (process.env.NODE_ENV !== 'production') {
    headers.origin = 'http://localhost:3000'
  }

  const { data: invited, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: { companie_id: companieId, funcao_user: role },
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
