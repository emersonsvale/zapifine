import { requireCurrentUser } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const body = await readBody<{ title: string; content_text: string; source_ref?: string; source_type?: string }>(event)
  const source_ref = body.source_ref ?? `kb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  return await callWhatsApi(event, '/ai-knowledge', {
    method: 'POST',
    body: {
      company_id: user.companie_id,
      source_type: body.source_type ?? 'text',
      source_ref,
      title: body.title,
      content_text: body.content_text,
    },
  })
})
