import { assertConnectionOwnership, requireCurrentUser } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id obrigatório' })
  await assertConnectionOwnership(id, user.companie_id)
  const body = await readBody<{ phone?: string }>(event).catch(() => null)
  return await callWhatsApi(event, `/connections/${id}/connect`, {
    method: 'POST',
    body: { phone: body?.phone },
  })
})
