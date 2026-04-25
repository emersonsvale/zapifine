import {
  compareTimes,
  requireDisponibilidadeAccess,
  validateDate,
  validateTime,
} from '~~/server/utils/disponibilidade-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

type Body = {
  user_id?: string
  excecao?: {
    data?: string
    kind?: 'bloqueio' | 'override'
    start_time?: string | null
    end_time?: string | null
    motivo?: string | null
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)
  const targetUserId = body.user_id ?? ''
  const me = await requireDisponibilidadeAccess(event, targetUserId)

  const ex = body.excecao
  if (!ex) {
    throw createError({ statusCode: 400, statusMessage: 'excecao obrigatória.' })
  }
  const data = validateDate(ex.data ?? '', 'data')
  const kind = ex.kind
  if (kind !== 'bloqueio' && kind !== 'override') {
    throw createError({ statusCode: 400, statusMessage: 'kind inválido.' })
  }

  let start: string | null = null
  let end: string | null = null
  if (kind === 'override') {
    start = validateTime(ex.start_time ?? '', 'start_time')
    end = validateTime(ex.end_time ?? '', 'end_time')
    if (compareTimes(end, start) <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'end_time deve ser posterior a start_time.',
      })
    }
  }

  const admin = useSupabaseAdmin()
  const { data: inserted, error } = await admin
    .from('agenda_excecoes')
    .insert({
      companie_id: me.companieId,
      user_id: targetUserId,
      data,
      kind,
      start_time: start,
      end_time: end,
      motivo: ex.motivo?.trim() || null,
    })
    .select('*')
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { ok: true, excecao: inserted }
})
