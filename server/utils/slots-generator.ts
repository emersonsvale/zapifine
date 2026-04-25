import { useSupabaseAdmin } from './supabase-admin'

export type Slot = { start: string; end: string } // HH:mm

type HorarioRow = { weekday: number; start_time: string; end_time: string; ativo: boolean | null }
type ExcecaoRow = { kind: string; start_time: string | null; end_time: string | null }
type AgendamentoBusy = { gg_start: string | null; gg_end: string | null }

function timeToMin(t: string): number {
  const [hh, mm] = t.split(':').map(Number)
  return (hh ?? 0) * 60 + (mm ?? 0)
}

function minToTime(m: number): string {
  const hh = Math.floor(m / 60)
  const mm = m % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/**
 * Gera slots livres de um user em uma data.
 * - Aplica disponibilidade semanal + override + bloqueio.
 * - Subtrai agendamentos existentes (não Cancelados).
 * - Discretiza em slots de `slotMinutes` min (default 30).
 */
export async function generateSlots(opts: {
  companieId: string
  userId: string
  dateISO: string // YYYY-MM-DD
  slotMinutes?: number
  durationMinutes?: number
}): Promise<Slot[]> {
  const slotMinutes = opts.slotMinutes ?? 30
  const durationMinutes = opts.durationMinutes ?? 60
  const admin = useSupabaseAdmin()

  const date = new Date(`${opts.dateISO}T12:00:00`)
  if (Number.isNaN(date.getTime())) return []
  const weekday = date.getDay()

  // 1. Bloqueio?
  const { data: excecoes } = await admin
    .from('agenda_excecoes')
    .select('kind, start_time, end_time')
    .eq('user_id', opts.userId)
    .eq('companie_id', opts.companieId)
    .eq('data', opts.dateISO)
    .returns<ExcecaoRow[]>()

  if (excecoes?.some((e: ExcecaoRow) => e.kind === 'bloqueio')) return []

  // 2. Override define windows; senão usa horários semanais
  let windows: Array<{ start: number; end: number }> = []
  const override = excecoes?.find((e: ExcecaoRow) => e.kind === 'override')
  if (override?.start_time && override.end_time) {
    windows.push({
      start: timeToMin(override.start_time),
      end: timeToMin(override.end_time),
    })
  } else {
    const { data: horarios } = await admin
      .from('agenda_horarios_semanal')
      .select('weekday, start_time, end_time, ativo')
      .eq('user_id', opts.userId)
      .eq('companie_id', opts.companieId)
      .eq('weekday', weekday)
      .eq('ativo', true)
      .returns<HorarioRow[]>()

    if (!horarios?.length) return []
    windows = horarios.map((h: HorarioRow) => ({
      start: timeToMin(h.start_time),
      end: timeToMin(h.end_time),
    }))
  }

  // 3. Buscar busy do dia
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const { data: busy } = await admin
    .from('agendamentos')
    .select('gg_start, gg_end')
    .eq('companie_id', opts.companieId)
    .eq('user_id', opts.userId)
    .neq('status_agenda', 'Cancelado')
    .gte('gg_start', dayStart.toISOString())
    .lte('gg_start', dayEnd.toISOString())
    .returns<AgendamentoBusy[]>()

  const busyRanges = (busy ?? [])
    .map((b: AgendamentoBusy) => {
      if (!b.gg_start || !b.gg_end) return null
      const s = new Date(b.gg_start)
      const e = new Date(b.gg_end)
      return {
        start: s.getHours() * 60 + s.getMinutes(),
        end: e.getHours() * 60 + e.getMinutes(),
      }
    })
    .filter(Boolean) as Array<{ start: number; end: number }>

  // 4. Gerar slots
  const out: Slot[] = []
  const now = new Date()
  const isToday =
    now.getFullYear() === date.getFullYear()
    && now.getMonth() === date.getMonth()
    && now.getDate() === date.getDate()
  const nowMin = isToday ? now.getHours() * 60 + now.getMinutes() : -1

  for (const w of windows) {
    let cursor = w.start
    while (cursor + durationMinutes <= w.end) {
      const slotEnd = cursor + durationMinutes
      const overlapsBusy = busyRanges.some(
        (b) => cursor < b.end && slotEnd > b.start,
      )
      const inPast = cursor <= nowMin
      if (!overlapsBusy && !inPast) {
        out.push({ start: minToTime(cursor), end: minToTime(slotEnd) })
      }
      cursor += slotMinutes
    }
  }

  return out
}
