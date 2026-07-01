import { requireCurrentUser } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const q = getQuery(event)
  const limit = typeof q.limit === 'string' ? q.limit : '50'
  return await callWhatsApi(event, '/ai-metrics/recent', {
    method: 'GET',
    query: { company_id: user.companie_id, limit },
  })
})
