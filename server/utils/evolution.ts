import { useSupabaseAdmin } from './supabase-admin'

type EvoSendTextResponse = {
  key?: { id?: string; remoteJid?: string }
  status?: string
  message?: { conversation?: string }
}

export type WhatsAppConnection = {
  id: string
  company_id: string | null
  provider: string | null
  instance_name: string | null
  apikey_evo: string | null
  cloud_api_access_token?: string | null
  cloud_api_phone_number_id?: string | null
  is_connected: boolean | null
  connection_status: string | null
}

export async function getActiveConnection(companyId: string): Promise<WhatsAppConnection | null> {
  const admin = useSupabaseAdmin()
  const { data } = await admin
    .from('whatsapp_connections')
    .select('id, company_id, provider, instance_name, apikey_evo, cloud_api_access_token, cloud_api_phone_number_id, is_connected, connection_status')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as WhatsAppConnection | null) ?? null
}

/**
 * Normaliza número (E.164 sem '+') pra remoteJid Evolution.
 * Aceita: "5511999999999", "+5511999999999", "5511999999999@s.whatsapp.net".
 */
function toRemoteJid(input: string): string {
  if (input.includes('@')) return input
  const digits = input.replace(/\D/g, '')
  if (!digits) throw new Error('Número WhatsApp inválido.')
  return `${digits}@s.whatsapp.net`
}

/**
 * Envia texto via Evolution API. Endpoint padrão:
 * POST {EVO_API_URL}/message/sendText/{instance}
 * Headers: apikey: <instance apikey ou global>
 * Body: { number, text }
 */
export async function sendEvolutionText(opts: {
  companyId: string
  to: string
  text: string
}): Promise<{ ok: boolean; messageId: string | null }> {
  const config = useRuntimeConfig()
  const baseUrl = (config.evoApiUrl as string).replace(/\/$/, '')
  const globalApiKey = config.evoGlobalApiKey as string

  if (!baseUrl) {
    throw new Error('EVO_API_URL ausente no .env.')
  }

  const conn = await getActiveConnection(opts.companyId)
  if (!conn || conn.provider !== 'evolution') {
    throw new Error('Empresa sem conexão Evolution ativa.')
  }
  if (!conn.instance_name) {
    throw new Error('Instância Evolution não encontrada.')
  }
  if (!conn.is_connected && conn.connection_status !== 'open') {
    throw new Error('WhatsApp não está conectado.')
  }

  const apikey = conn.apikey_evo ?? globalApiKey
  if (!apikey) {
    throw new Error('apikey Evolution ausente.')
  }

  const remoteJid = toRemoteJid(opts.to)
  const numberDigits = remoteJid.split('@')[0]

  const url = `${baseUrl}/message/sendText/${encodeURIComponent(conn.instance_name)}`
  try {
    const res = await $fetch<EvoSendTextResponse>(url, {
      method: 'POST',
      headers: {
        apikey,
        'content-type': 'application/json',
      },
      body: {
        number: numberDigits,
        text: opts.text,
      },
    })
    return { ok: true, messageId: res.key?.id ?? null }
  } catch (err) {
    const e = err as { data?: { message?: string }; message?: string; statusCode?: number }
    throw new Error(
      `Evolution sendText falhou: ${e.data?.message ?? e.message ?? `HTTP ${e.statusCode}`}`,
    )
  }
}

/**
 * Stub Cloud API (Meta). Implementar quando integração Meta entrar.
 */
export async function sendCloudApiText(_opts: {
  companyId: string
  to: string
  text: string
}): Promise<{ ok: boolean; messageId: string | null }> {
  throw new Error('Cloud API (Meta) ainda não implementada.')
}

export async function sendWhatsappText(opts: {
  companyId: string
  to: string
  text: string
}): Promise<{ ok: boolean; messageId: string | null; provider: string }> {
  const conn = await getActiveConnection(opts.companyId)
  const provider = conn?.provider ?? 'evolution'

  if (provider === 'cloud_api') {
    const r = await sendCloudApiText(opts)
    return { ...r, provider }
  }
  const r = await sendEvolutionText(opts)
  return { ...r, provider }
}
