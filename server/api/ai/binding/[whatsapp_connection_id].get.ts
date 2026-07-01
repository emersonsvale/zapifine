import { requireCurrentUser, assertConnectionOwnership } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const id = getRouterParam(event, 'whatsapp_connection_id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id obrigatório' })
  await assertConnectionOwnership(id, user.companie_id)
  return await callWhatsApi(event, `/ai-binding/${id}`, { method: 'GET' })
})
