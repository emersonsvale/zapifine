import type { H3Event } from 'h3'

export type WhatsApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | undefined>
}

export async function callWhatsApi<T>(_event: H3Event, path: string, opts: WhatsApiOptions = {}): Promise<T> {
  const base = (
    process.env.WHATS_API_INTERNAL_URL
    ?? process.env.WHATS_API_URL
    ?? ''
  ).replace(/\/+$/, '')
  const secret = process.env.WHATS_API_INTERNAL_SECRET ?? ''
  if (!base || !secret) {
    throw createError({ statusCode: 500, statusMessage: 'whats-api internal config ausente.' })
  }
  const res = await $fetch(`${base}${path}`, {
    method: opts.method ?? 'GET',
    headers: { 'x-internal-secret': secret },
    body: opts.body as Record<string, unknown> | undefined,
    query: opts.query,
  })
  return res as T
}

export type WhatsApiSendResult = {
  ok?: boolean
  _messageId?: string | null
  error?: string
}

/**
 * Endpoints públicos de envio (/send/*) da whats-api — os mesmos que o client
 * usa via useWhatsApi. Não exigem o segredo interno, mas ele é enviado quando
 * configurado. Usado por workers (cron) que não têm sessão de usuário.
 */
export async function sendViaWhatsApi(
  path: '/send/text' | '/send/media' | '/send/link',
  body: Record<string, unknown>,
): Promise<WhatsApiSendResult> {
  const base = (
    process.env.WHATS_API_INTERNAL_URL
    ?? process.env.WHATS_API_URL
    ?? 'https://whats.zapifine.com'
  ).replace(/\/+$/, '')
  const secret = process.env.WHATS_API_INTERNAL_SECRET ?? ''
  const res = await $fetch<WhatsApiSendResult>(`${base}${path}`, {
    method: 'POST',
    headers: secret ? { 'x-internal-secret': secret } : {},
    body,
  })
  if (res && res.ok === false) {
    throw new Error(res.error ?? 'whats-api recusou o envio.')
  }
  return res ?? {}
}
