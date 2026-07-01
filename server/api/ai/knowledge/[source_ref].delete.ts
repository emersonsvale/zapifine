import { requireCurrentUser } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const source_ref = getRouterParam(event, 'source_ref')
  if (!source_ref) throw createError({ statusCode: 400, statusMessage: 'source_ref obrigatório' })
  return await callWhatsApi(event, `/ai-knowledge/${encodeURIComponent(source_ref)}`, {
    method: 'DELETE',
    query: { company_id: user.companie_id },
  })
})
