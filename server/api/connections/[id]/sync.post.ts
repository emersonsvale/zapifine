import { assertConnectionOwnership, requireCurrentUser } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id obrigatório' })
  await assertConnectionOwnership(id, user.companie_id)
  const body = await readBody<{ chatsLimit?: number; messagesPerChat?: number }>(event).catch(
    () => null,
  )
  return await callWhatsApi(event, `/connections/${id}/sync`, {
    method: 'POST',
    body: body ?? {},
  })
})
