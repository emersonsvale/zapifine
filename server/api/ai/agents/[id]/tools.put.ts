import { requireCurrentUser } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

export default defineEventHandler(async (event) => {
  await requireCurrentUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id obrigatório' })
  const body = await readBody<{ tool_slugs: string[] }>(event)
  return await callWhatsApi(event, `/ai-agents/${id}/tools`, { method: 'PUT', body })
})
