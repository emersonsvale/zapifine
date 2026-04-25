import type { H3Event } from 'h3'
import { requireMembership, type Membership } from './agendamentos-helpers'

const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function validateTime(t: string, label: string): string {
  if (!t || typeof t !== 'string' || !TIME_RE.test(t)) {
    throw createError({
      statusCode: 400,
      statusMessage: `${label} inválido (HH:mm).`,
    })
  }
  return t.length === 5 ? `${t}:00` : t
}

export function validateDate(d: string, label: string): string {
  if (!d || typeof d !== 'string' || !DATE_RE.test(d)) {
    throw createError({
      statusCode: 400,
      statusMessage: `${label} inválido (YYYY-MM-DD).`,
    })
  }
  return d
}

export function compareTimes(a: string, b: string): number {
  return a.localeCompare(b)
}

/**
 * Valida que o user pode mexer na disponibilidade do `targetUserId`.
 * Regra: OWNER pode editar qualquer user da empresa. Outros só o próprio.
 */
export async function requireDisponibilidadeAccess(
  event: H3Event,
  targetUserId: string,
): Promise<Membership> {
  const me = await requireMembership(event)
  if (!targetUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'user_id obrigatório.',
    })
  }
  if (me.userId !== targetUserId && me.funcao !== 'OWNER') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Apenas o dono pode alterar a disponibilidade de outros usuários.',
    })
  }
  return me
}
