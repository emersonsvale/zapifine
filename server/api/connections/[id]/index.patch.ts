import { assertConnectionOwnership, requireCurrentUser } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

type Body = { display_name?: string; is_principal?: boolean }

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id obrigatório' })
  await assertConnectionOwnership(id, user.companie_id)
  const body = await readBody<Body>(event)
  return await callWhatsApi(event, `/connections/${id}`, {
    method: 'PATCH',
    body,
  })
})
