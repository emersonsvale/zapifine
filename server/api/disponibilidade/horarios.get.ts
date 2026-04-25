import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  const query = getQuery(event)
  const targetUserId = (query.user_id as string | undefined) || me.userId

  // Qualquer membro da empresa pode ver disponibilidade de outros (read-only)
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

  const { data, error } = await admin
    .from('agenda_horarios_semanal')
    .select('*')
    .eq('user_id', targetUserId)
    .order('weekday', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { horarios: data ?? [] }
})
