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
