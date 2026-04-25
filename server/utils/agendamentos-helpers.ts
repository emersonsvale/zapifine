import type { H3Event } from 'h3'
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import type { Database } from '~~/types/database'

export type Membership = {
  userId: string
  companieId: string
  funcao: 'OWNER' | 'EMPLOYEE' | 'VIEWER' | string | null
}

export async function requireMembership(event: H3Event): Promise<Membership> {
  const authUser = await serverSupabaseUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
  }

  const supa = await serverSupabaseClient<Database>(event)
  const { data: me, error } = await supa
    .from('users')
    .select('id, companie_id, funcao_user')
    .eq('id', authUser.id)
    .maybeSingle()

  if (error || !me?.companie_id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Sua conta não está vinculada a uma empresa.',
    })
  }
  if (me.funcao_user === 'VIEWER') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Visualizadores não podem alterar agendamentos.',
    })
  }

  return {
    userId: me.id,
    companieId: me.companie_id,
    funcao: (me.funcao_user as string) ?? null,
  }
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/

export function parseDateTimeInput(input: string, label: string): string {
  if (!input || typeof input !== 'string') {
    throw createError({ statusCode: 400, statusMessage: `${label} obrigatório.` })
  }
  const trimmed = input.trim()
  if (!ISO_RE.test(trimmed)) {
    throw createError({
      statusCode: 400,
      statusMessage: `${label} deve estar em ISO 8601 (ex: 2026-04-25T14:30:00-03:00).`,
    })
  }
  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) {
    throw createError({ statusCode: 400, statusMessage: `${label} inválido.` })
  }
  return d.toISOString()
}

export type AttendeeInput = {
  email: string
  display_name?: string | null
  lead_id?: number | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeAttendees(raw: unknown): AttendeeInput[] {
  if (!Array.isArray(raw)) return []
  const out: AttendeeInput[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const a = item as Record<string, unknown>
    const email = typeof a.email === 'string' ? a.email.trim().toLowerCase() : ''
    if (!email || !EMAIL_RE.test(email)) continue
    if (seen.has(email)) continue
    seen.add(email)
    out.push({
      email,
      display_name: typeof a.display_name === 'string' ? a.display_name.trim() : null,
      lead_id: typeof a.lead_id === 'number' ? a.lead_id : null,
    })
  }
  return out
}

export const DEFAULT_TZ = 'America/Sao_Paulo'
