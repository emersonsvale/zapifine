import { requireCurrentUser } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const body = await readBody<Record<string, unknown>>(event)
  return await callWhatsApi<{ agent: unknown }>(event, '/ai-agents', {
    method: 'POST',
    body: { ...body, company_id: user.companie_id },
  })
})
