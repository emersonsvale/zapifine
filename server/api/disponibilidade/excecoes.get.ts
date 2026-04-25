import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  const query = getQuery(event)
  const targetUserId = (query.user_id as string | undefined) || me.userId

  const admin = useSupabaseAdmin()
  const { data: targetUser } = await admin
    .from('users')
    .select('id, companie_id')
    .eq('id', targetUserId)
    .maybeSingle()

  if (!targetUser || targetUser.companie_id !== me.companieId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Usuário não pertence à sua empresa.',
    })
  }

  let q = admin
    .from('agenda_excecoes')
    .select('*')
    .eq('user_id', targetUserId)
    .order('data', { ascending: true })

  if (typeof query.from === 'string') q = q.gte('data', query.from)
  if (typeof query.to === 'string') q = q.lte('data', query.to)

  const { data, error } = await q
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { excecoes: data ?? [] }
})
