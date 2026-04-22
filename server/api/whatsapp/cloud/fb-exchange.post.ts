import { serverSupabaseUser } from '#supabase/server'

type Body = {
  code?: string
  phoneNumberId?: string | null
  wabaId?: string | null
  coexistence?: boolean
}

type ExchangeResponse = {
  access_token?: string
  token_type?: string
  expires_in?: number
  error?: { message?: string; type?: string; code?: number }
}

type GraphPhoneResponse = {
  id?: string
  verified_name?: string
  display_phone_number?: string
  name_status?: string
  quality_rating?: string
  whatsapp_business_account?: { id?: string }
  error?: { message?: string }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const appId = config.public.metaAppId as string
  const appSecret = config.metaAppSecret as string
  const graphVersion =
    (config.public.metaGraphVersion as string) || 'v20.0'

  if (!appId || !appSecret) {
    throw createError({
      statusCode: 501,
      statusMessage:
        'META_APP_ID/META_APP_SECRET ausentes no .env. Embedded Signup indisponível.',
    })
  }

  const authUser = await serverSupabaseUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
  }

  const body = await readBody<Body>(event)
  const code = body.code?.trim()
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'code obrigatório.' })
  }

  const graphBase = `https://graph.facebook.com/${graphVersion}`

  // 1. Exchange authorization code → short-lived user access token
  let exchange: ExchangeResponse
  try {
    exchange = await $fetch<ExchangeResponse>(
      `${graphBase}/oauth/access_token`,
      {
        method: 'GET',
        query: {
          client_id: appId,
          client_secret: appSecret,
          code,
        },
      },
    )
  } catch (err) {
    const e = err as { data?: ExchangeResponse; message?: string }
    throw createError({
      statusCode: 400,
      statusMessage:
        e.data?.error?.message ?? e.message ?? 'Falha ao trocar o code.',
    })
  }

  if (!exchange.access_token) {
    throw createError({
      statusCode: 400,
      statusMessage: exchange.error?.message ?? 'access_token não retornado.',
    })
  }

  const accessToken = exchange.access_token

  // 2. If Embedded Signup não mandou phone_number_id, tentar descobrir
  //    via debug_token → WABA → phone_numbers list (best-effort).
  let phoneNumberId = body.phoneNumberId?.trim() || null
  let wabaId = body.wabaId?.trim() || null

  if (!phoneNumberId && wabaId) {
    try {
      const list = await $fetch<{
        data?: Array<{
          id?: string
          display_phone_number?: string
          verified_name?: string
        }>
      }>(`${graphBase}/${encodeURIComponent(wabaId)}/phone_numbers`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      phoneNumberId = list.data?.[0]?.id ?? null
    } catch {
      // ignore; client precisará informar manualmente
    }
  }

  // 3. Validate phone number + pull metadata
  let phoneRes: GraphPhoneResponse | null = null
  if (phoneNumberId) {
    try {
      phoneRes = await $fetch<GraphPhoneResponse>(
        `${graphBase}/${encodeURIComponent(phoneNumberId)}`,
        {
          method: 'GET',
          query: {
            fields:
              'id,verified_name,display_phone_number,name_status,quality_rating,whatsapp_business_account{id}',
          },
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      )
      wabaId = wabaId ?? phoneRes?.whatsapp_business_account?.id ?? null
    } catch (err) {
      const e = err as { data?: GraphPhoneResponse; message?: string }
      throw createError({
        statusCode: 400,
        statusMessage:
          e.data?.error?.message ??
          e.message ??
          'Token gerado, mas falhou ao ler phone_number_id.',
      })
    }
  }

  return {
    ok: true,
    accessToken,
    expiresIn: exchange.expires_in ?? null,
    phoneNumberId,
    wabaId,
    displayPhoneNumber: phoneRes?.display_phone_number ?? null,
    verifiedName: phoneRes?.verified_name ?? null,
    nameStatus: phoneRes?.name_status ?? null,
    qualityRating: phoneRes?.quality_rating ?? null,
  }
})
