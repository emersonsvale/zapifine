import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)

  const admin = useSupabaseAdmin()
  const { data, error } = await admin
    .from('users')
    .select('id, nome, email, funcao_user, foto_perfil, status')
    .eq('companie_id', me.companieId)
    .neq('status', 'Desativado')
    .order('nome', { ascending: true, nullsFirst: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { members: data ?? [] }
})
