import { serverSupabaseUser } from '#supabase/server'

type Body = {
  accessToken?: string
  phoneNumberId?: string
}

type GraphPhoneResponse = {
  verified_name?: string
  display_phone_number?: string
  name_status?: string
  quality_rating?: string
  id?: string
  error?: { message?: string; type?: string; code?: number }
}

type GraphWabaResponse = {
  id?: string
  message_template_namespace?: string
  error?: { message?: string; type?: string; code?: number }
}

export default defineEventHandler(async (event) => {
  const authUser = await serverSupabaseUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
  }

  const body = await readBody<Body>(event)
  const accessToken = body.accessToken?.trim()
  const phoneNumberId = body.phoneNumberId?.trim()

  if (!accessToken || !phoneNumberId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'accessToken e phoneNumberId são obrigatórios.',
    })
  }

  const graphBase = 'https://graph.facebook.com/v20.0'

  let phoneRes: GraphPhoneResponse
  try {
    phoneRes = await $fetch<GraphPhoneResponse>(
      `${graphBase}/${encodeURIComponent(phoneNumberId)}`,
      {
        method: 'GET',
        query: {
          fields: 'id,verified_name,display_phone_number,name_status,quality_rating',
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    )
  } catch (err) {
    const e = err as { data?: GraphPhoneResponse; message?: string }
    const apiMsg = e.data?.error?.message ?? e.message ?? 'Falha ao validar.'
    throw createError({ statusCode: 400, statusMessage: apiMsg })
  }

  if (phoneRes.error) {
    throw createError({
      statusCode: 400,
      statusMessage: phoneRes.error.message ?? 'Credenciais inválidas.',
    })
  }

  // Best-effort: discover WABA id via ?fields=whatsapp_business_account
  let wabaId: string | null = null
  try {
    const waba = await $fetch<GraphPhoneResponse & {
      whatsapp_business_account?: { id?: string }
    }>(`${graphBase}/${encodeURIComponent(phoneNumberId)}`, {
      method: 'GET',
      query: { fields: 'whatsapp_business_account{id}' },
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    wabaId = waba.whatsapp_business_account?.id ?? null
  } catch {
    // non-fatal
  }

  return {
    ok: true,
    phoneNumberId: phoneRes.id ?? phoneNumberId,
    displayPhoneNumber: phoneRes.display_phone_number ?? null,
    verifiedName: phoneRes.verified_name ?? null,
    nameStatus: phoneRes.name_status ?? null,
    qualityRating: phoneRes.quality_rating ?? null,
    wabaId,
  }
})
