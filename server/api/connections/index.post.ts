import { requireCurrentUser } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

type Body = {
  provider:
    | 'whatsapp_evolution'
    | 'whatsapp_uazapi'
    | 'whatsapp_cloud'
    | 'instagram'
    | 'facebook'
  display_name?: string
  is_principal?: boolean
}

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const body = await readBody<Body>(event)
  if (!body?.provider) {
    throw createError({ statusCode: 400, statusMessage: 'provider obrigatório' })
  }
  return await callWhatsApi(event, '/connections', {
    method: 'POST',
    body: {
      company_id: user.companie_id,
      user_id: user.auth_id,
      provider: body.provider,
      display_name: body.display_name,
      is_principal: body.is_principal ?? false,
    },
  })
})
