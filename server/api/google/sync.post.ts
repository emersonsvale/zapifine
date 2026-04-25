import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { syncCompanyEvents } from '~~/server/utils/google-sync'

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  return await syncCompanyEvents(me.companieId)
})
