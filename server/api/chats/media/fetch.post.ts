import { requireCurrentUser } from '~~/server/utils/auth-company'
import { callWhatsApi } from '~~/server/utils/whats-api'

/**
 * Baixa sob demanda (opt-in) uma mídia pesada (vídeo/documento) que ficou
 * pendente no ingest. Faz proxy autenticado pra whats-api /media/fetch, que
 * baixa do provider, sobe no storage e grava midia_url na mensagem.
 */
export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const body = await readBody<{ message_wa_id?: string }>(event)
  const messageWaId = body?.message_wa_id?.trim()
  if (!messageWaId) {
    throw createError({ statusCode: 400, statusMessage: 'message_wa_id obrigatório.' })
  }

  return await callWhatsApi<{ ok: boolean; midia_url?: string; tipo?: string; already?: boolean }>(
    event,
    '/media/fetch',
    {
      method: 'POST',
      body: { message_wa_id: messageWaId, company_id: user.companie_id },
    },
  )
})
