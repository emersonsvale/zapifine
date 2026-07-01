import { requireCurrentUser } from '~~/server/utils/auth-company'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'
import { callWhatsApi } from '~~/server/utils/whats-api'

async function assertConversaOwnership(conversa_id: number, company_id: string) {
  const admin = useSupabaseAdmin()
  const { data } = await admin
    .from('whats_conversa')
    .select('id, companies_id')
    .eq('id', conversa_id)
    .maybeSingle()
  if (!data || (data as { companies_id: string }).companies_id !== company_id) {
    throw createError({ statusCode: 404, statusMessage: 'Conversa não encontrada.' })
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const raw = getRouterParam(event, 'conversa_id')
  const conversa_id = Number(raw)
  if (!Number.isFinite(conversa_id)) {
    throw createError({ statusCode: 400, statusMessage: 'conversa_id inválido' })
  }
  await assertConversaOwnership(conversa_id, user.companie_id)
  return await callWhatsApi(event, `/ai-conversation/${conversa_id}`, { method: 'GET' })
})
