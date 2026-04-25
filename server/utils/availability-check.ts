import { useSupabaseAdmin } from './supabase-admin'

export type AvailabilityResult = {
  available: boolean
  reason: string | null
}

/**
 * Checa se o slot [startIso, endIso] cabe na disponibilidade do user.
 * Regras (em ordem):
 * 1. Bloqueio em agenda_excecoes pra dia → indisponível.
 * 2. Override em agenda_excecoes pra dia → usa horário do override.
 * 3. Senão → usa agenda_horarios_semanal pelo weekday.
 * 4. Se user não tem nenhum horário cadastrado → considera disponível (sem restrição).
 */
export async function checkUserAvailability(opts: {
  userId: string
  companieId: string
  startIso: string
  endIso: string
}): Promise<AvailabilityResult> {
  const start = new Date(opts.startIso)
  const end = new Date(opts.endIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { available: false, reason: 'Datas inválidas.' }
  }

  // Garante mesmo dia (não suportamos cross-day por enquanto)
  if (
    start.getFullYear() !== end.getFullYear()
    || start.getMonth() !== end.getMonth()
    || start.getDate() !== end.getDate()
  ) {
    return {
      available: false,
      reason: 'Agendamentos cross-day não são suportados pela disponibilidade.',
    }
  }

  const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
  const startMin = start.getHours() * 60 + start.getMinutes()
  const endMin = end.getHours() * 60 + end.getMinutes()

  const admin = useSupabaseAdmin()

  // 1+2: exceções da data
  type ExcecaoLite = { kind: string; start_time: string | null; end_time: string | null }
  const { data: excecoes } = await admin
    .from('agenda_excecoes')
    .select('kind, start_time, end_time')
    .eq('user_id', opts.userId)
    .eq('companie_id', opts.companieId)
    .eq('data', dateStr)
    .returns<ExcecaoLite[]>()

  if (excecoes?.length) {
    const bloqueio = excecoes.find((e: ExcecaoLite) => e.kind === 'bloqueio')
    if (bloqueio) {
      return {
        available: false,
        reason: `Atendente bloqueado em ${dateStr}.`,
      }
    }
    const override = excecoes.find((e: ExcecaoLite) => e.kind === 'override')
    if (override?.start_time && override.end_time) {
      const oStart = timeToMin(override.start_time)
      const oEnd = timeToMin(override.end_time)
      if (startMin >= oStart && endMin <= oEnd) {
        return { available: true, reason: null }
      }
      return {
        available: false,
        reason: `Slot fora do override do dia (${override.start_time.slice(0, 5)} → ${override.end_time.slice(0, 5)}).`,
      }
    }
  }

  // 3: horários semanais
  type HorarioLite = { start_time: string; end_time: string; ativo: boolean | null }
  const weekday = start.getDay() // 0=domingo
  const { data: horarios } = await admin
    .from('agenda_horarios_semanal')
    .select('start_time, end_time, ativo')
    .eq('user_id', opts.userId)
    .eq('companie_id', opts.companieId)
    .eq('weekday', weekday)
    .eq('ativo', true)
    .returns<HorarioLite[]>()

  if (!horarios?.length) {
    // 4: nenhum horário cadastrado → permite (sem restrição)
    const { count } = await admin
      .from('agenda_horarios_semanal')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', opts.userId)
      .eq('companie_id', opts.companieId)
    if ((count ?? 0) === 0) {
      return { available: true, reason: null }
    }
    return {
      available: false,
      reason: 'Atendente não atende neste dia da semana.',
    }
  }

  const fits = horarios.some((h: HorarioLite) => {
    const hStart = timeToMin(h.start_time)
    const hEnd = timeToMin(h.end_time)
    return startMin >= hStart && endMin <= hEnd
  })

  if (fits) return { available: true, reason: null }
  const ranges = horarios
    .map((h: HorarioLite) => `${h.start_time.slice(0, 5)}→${h.end_time.slice(0, 5)}`)
    .join(', ')
  return {
    available: false,
    reason: `Slot fora dos horários disponíveis do atendente (${ranges}).`,
  }
}

function timeToMin(t: string): number {
  const [hh, mm] = t.split(':').map(Number)
  return (hh ?? 0) * 60 + (mm ?? 0)
}
