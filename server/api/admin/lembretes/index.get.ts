import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  if (me.funcao !== 'OWNER') {
    throw createError({ statusCode: 403, statusMessage: 'Apenas o dono.' })
  }

  const query = getQuery(event)
  const status = typeof query.status === 'string' ? query.status : null
  const limit = Math.min(Number(query.limit) || 100, 500)

  const admin = useSupabaseAdmin()

  // Fila de lembretes da empresa do user (via join com agendamentos)
  let q = admin
    .from('agenda_lembretes')
    .select('id, agendamento_id, fire_at, channel, target, payload, status, attempts, last_error, sent_at, created_at, agendamentos!inner(companie_id, gg_title, gg_start)')
    .eq('agendamentos.companie_id', me.companieId)
    .order('fire_at', { ascending: false })
    .limit(limit)

  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Stats
  const { data: stats } = await admin
    .from('agenda_lembretes')
    .select('status, agendamentos!inner(companie_id)')
    .eq('agendamentos.companie_id', me.companieId)

  const counts = { pending: 0, sent: 0, failed: 0, skipped: 0 }
  for (const row of stats ?? []) {
    const s = (row as { status: string }).status as keyof typeof counts
    if (s in counts) counts[s]++
  }

  return { lembretes: data ?? [], stats: counts }
})
