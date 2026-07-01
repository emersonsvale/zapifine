import { requireCurrentUser } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

export default defineEventHandler(async (event) => {
  await requireCurrentUser(event)
  return await callWhatsApi(event, '/ai-agents/tools/catalog', { method: 'GET' })
})
