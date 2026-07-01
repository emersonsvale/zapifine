import { requireCurrentUser } from '~~/server/utils/auth-company'

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const config = useRuntimeConfig()
  const base = (config.whatsApiInternalUrl as string).replace(/\/+$/, '')
  const secret = config.whatsApiInternalSecret as string
  if (!base || !secret) {
    throw createError({ statusCode: 500, statusMessage: 'whats-api internal config ausente.' })
  }

  const parts = await readMultipartFormData(event)
  if (!parts) throw createError({ statusCode: 400, statusMessage: 'multipart obrigatório' })

  const form = new FormData()
  form.append('company_id', user.companie_id)
  for (const p of parts) {
    if (!p.name) continue
    if (p.name === 'file') {
      const blob = new Blob([new Uint8Array(p.data)], { type: p.type ?? 'application/octet-stream' })
      form.append('file', blob, p.filename ?? 'arquivo')
    } else {
      form.append(p.name, p.data.toString('utf-8'))
    }
  }

  const res = await $fetch<{ ok: boolean; chunks: number; filename: string }>(
    `${base}/ai-knowledge/upload`,
    { method: 'POST', headers: { 'x-internal-secret': secret }, body: form as never },
  )
  return res
})
