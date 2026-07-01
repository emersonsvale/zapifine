import { requireCurrentUser } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  return await callWhatsApi(event, '/ai-knowledge/sources', {
    method: 'GET',
    query: { company_id: user.companie_id },
  })
})
