import { requireDisponibilidadeAccess, validateTime, compareTimes } from '~~/server/utils/disponibilidade-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

type Item = {
  weekday?: number
  start_time?: string
  end_time?: string
  ativo?: boolean
}

type Body = {
  user_id?: string
  items?: Item[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)
  const targetUserId = body.user_id ?? ''
  const me = await requireDisponibilidadeAccess(event, targetUserId)

  if (!Array.isArray(body.items)) {
    throw createError({ statusCode: 400, statusMessage: 'items obrigatório (array).' })
  }

  const rows = body.items.map((it, idx) => {
    if (typeof it.weekday !== 'number' || it.weekday < 0 || it.weekday > 6) {
      throw createError({
        statusCode: 400,
        statusMessage: `items[${idx}].weekday inválido (0-6).`,
      })
    }
    const start = validateTime(it.start_time ?? '', `items[${idx}].start_time`)
    const end = validateTime(it.end_time ?? '', `items[${idx}].end_time`)
    if (compareTimes(end, start) <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `items[${idx}].end_time deve ser posterior a start_time.`,
      })
    }
    return {
      companie_id: me.companieId,
      user_id: targetUserId,
      weekday: it.weekday,
      start_time: start,
      end_time: end,
      ativo: it.ativo ?? true,
    }
  })

  const admin = useSupabaseAdmin()

  // Replace all: deleta horários atuais do user e insere os novos
  const { error: delErr } = await admin
    .from('agenda_horarios_semanal')
    .delete()
    .eq('user_id', targetUserId)
    .eq('companie_id', me.companieId)

  if (delErr) {
    throw createError({ statusCode: 500, statusMessage: delErr.message })
  }

  if (rows.length) {
    const { error: insErr } = await admin
      .from('agenda_horarios_semanal')
      .insert(rows)
    if (insErr) {
      throw createError({ statusCode: 500, statusMessage: insErr.message })
    }
  }

  return { ok: true, count: rows.length }
})
