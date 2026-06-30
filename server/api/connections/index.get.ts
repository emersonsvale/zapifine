import { requireCurrentUser } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const res = await callWhatsApi<{ connections: unknown[] }>(event, '/connections', {
    method: 'GET',
    query: { company_id: user.companie_id },
  })
  return res
})
