import { generateSlots } from '~~/server/utils/slots-generator'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug obrigatório.' })

  const query = getQuery(event)
  const userId = typeof query.user_id === 'string' ? query.user_id : null
  const date = typeof query.date === 'string' ? query.date : null
  const duration = Number(query.duration) || 60

  if (!userId) throw createError({ statusCode: 400, statusMessage: 'user_id obrigatório.' })
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

  const slots = await generateSlots({
    companieId: company.id,
    userId,
    dateISO: date,
    durationMinutes: duration,
  })

  return { date, user_id: userId, duration, slots }
})
