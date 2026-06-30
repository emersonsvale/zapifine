import { assertConnectionOwnership, requireCurrentUser } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

type Body = {
  accessToken: string
  phoneNumberId: string
  wabaId?: string | null
  appId?: string | null
  coexistence?: boolean
}

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id obrigatório' })
  await assertConnectionOwnership(id, user.companie_id)
  const body = await readBody<Body>(event)
  if (!body?.accessToken || !body?.phoneNumberId) {
    throw createError({ statusCode: 400, statusMessage: 'accessToken e phoneNumberId obrigatórios' })
  }
  return await callWhatsApi(event, `/connections/${id}/configure-cloud`, {
    method: 'POST',
    body,
  })
})
