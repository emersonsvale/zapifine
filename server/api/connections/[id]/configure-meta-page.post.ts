import { assertConnectionOwnership, requireCurrentUser } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

type Body = {
  user_access_token: string
  page_id: string
  page_access_token: string
  page_name?: string
  instagram_business_id?: string | null
  app_id?: string | null
}

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id obrigatório' })
  await assertConnectionOwnership(id, user.companie_id)
  const body = await readBody<Body>(event)
  if (!body?.page_id || !body?.page_access_token || !body?.user_access_token) {
    throw createError({ statusCode: 400, statusMessage: 'page_id, page_access_token e user_access_token obrigatórios' })
  }
  return await callWhatsApi(event, `/connections/${id}/configure-meta-page`, {
    method: 'POST',
    body,
  })
})
