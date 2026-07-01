import { requireCurrentUser } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const q = getQuery(event)
  const days = typeof q.days === 'string' ? q.days : '30'
  return await callWhatsApi(event, '/ai-metrics/summary', {
    method: 'GET',
    query: { company_id: user.companie_id, days },
  })
})
