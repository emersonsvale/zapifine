import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  if (me.funcao !== 'OWNER') {
    throw createError({ statusCode: 403, statusMessage: 'Apenas o dono.' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id obrigatório.' })

  const admin = useSupabaseAdmin()
  const { data: lem } = await admin
    .from('agenda_lembretes')
    .select('id, agendamento_id, status, agendamentos!inner(companie_id)')
    .eq('id', id)
    .maybeSingle()

  if (!lem) {
    throw createError({ statusCode: 404, statusMessage: 'Lembrete não encontrado.' })
  }
  const agCompanieId = (lem as { agendamentos: { companie_id: string } }).agendamentos.companie_id
  if (agCompanieId !== me.companieId) {
    throw createError({ statusCode: 403, statusMessage: 'Sem permissão.' })
  }

  const { error } = await admin
    .from('agenda_lembretes')
    .update({
      status: 'pending',
      attempts: 0,
      last_error: null,
      sent_at: null,
      fire_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true, id }
})
