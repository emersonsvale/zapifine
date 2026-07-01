import { requireCurrentUser, assertConnectionOwnership } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const body = await readBody<{
    whatsapp_connection_id: string
    orchestrator_agent_id: string
    group_trigger_prefix?: string
  }>(event)
  await assertConnectionOwnership(body.whatsapp_connection_id, user.companie_id)
  return await callWhatsApi(event, '/ai-binding', { method: 'PUT', body })
})
