import { generateSlots } from '~~/server/utils/slots-generator'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug obrigatório.' })

  const query = getQuery(event)
  const userId = typeof query.user_id === 'string' && query.user_id ? query.user_id : null
  const date = typeof query.date === 'string' ? query.date : null
  const duration = Number(query.duration) || 60

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError({ statusCode: 400, statusMessage: 'date (YYYY-MM-DD) obrigatório.' })
  }

  const admin = useSupabaseAdmin()
  const { data: company } = await admin
    .from('companies')
    .select('id, agenda_publico_ativo')
    .eq('agenda_publico_slug', slug)
    .maybeSingle()

  if (!company || !company.agenda_publico_ativo) {
    throw createError({ statusCode: 404, statusMessage: 'Agenda pública não encontrada.' })
  }

  // user específico: gera direto
  if (userId) {
    const slots = await generateSlots({
      companieId: company.id,
      userId,
      dateISO: date,
      durationMinutes: duration,
    })
    return { date, user_id: userId, duration, slots }
  }

  // "qualquer atendente": união dos slots de todos os atendentes elegíveis
  type UserLite = { id: string; agenda_horarios_semanal: { id: number }[] }
  const { data: members } = await admin
    .from('users')
    .select('id, agenda_horarios_semanal!inner(id)')
    .eq('companie_id', company.id)
    .neq('status', 'Desativado')
    .returns<UserLite[]>()

  const memberIds = Array.from(new Set((members ?? []).map(m => m.id)))
  const allSlots = await Promise.all(
    memberIds.map(uid =>
      generateSlots({
        companieId: company.id,
        userId: uid,
        dateISO: date,
        durationMinutes: duration,
      }),
    ),
  )

  const seen = new Set<string>()
  const merged: Array<{ start: string; end: string }> = []
  for (const list of allSlots) {
    for (const s of list) {
      if (seen.has(s.start)) continue
      seen.add(s.start)
      merged.push(s)
    }
  }
  merged.sort((a, b) => a.start.localeCompare(b.start))

  return { date, user_id: null, duration, slots: merged }
})
