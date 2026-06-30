import { useSupabaseAdmin } from './supabase-admin'

type EvoSendTextResponse = {
  key?: { id?: string; remoteJid?: string }
  status?: string
  message?: { conversation?: string }
}

export type ChannelType =
  | 'whatsapp_evolution'
  | 'whatsapp_uazapi'
  | 'whatsapp_cloud'
  | 'instagram'
  | 'facebook'

export type WhatsAppConnection = {
  id: string
  company_id: string | null
  provider: ChannelType
  display_name: string | null
  external_id: string | null
  is_principal: boolean
  instance_name: string | null
  apikey_evo: string | null
  uazapi_instance_token: string | null
  cloud_api_access_token: string | null
  cloud_api_phone_number_id: string | null
  is_connected: boolean | null
  connection_status: string | null
}

const SELECT_COLS =
  'id, company_id, provider, display_name, external_id, is_principal, instance_name, apikey_evo, uazapi_instance_token, cloud_api_access_token, cloud_api_phone_number_id, is_connected, connection_status'

export async function getConnectionById(id: string): Promise<WhatsAppConnection | null> {
  const admin = useSupabaseAdmin()
  const { data } = await admin
    .from('whatsapp_connections')
    .select(SELECT_COLS)
    .eq('id', id)
    .maybeSingle()
  return (data as WhatsAppConnection | null) ?? null
}

export async function getPrincipalConnection(companyId: string): Promise<WhatsAppConnection | null> {
  const admin = useSupabaseAdmin()
  const { data } = await admin
    .from('whatsapp_connections')
    .select(SELECT_COLS)
    .eq('company_id', companyId)
    .eq('is_principal', true)
    .limit(1)
    .maybeSingle()
  return (data as WhatsAppConnection | null) ?? null
}

export async function listConnectionsByCompany(companyId: string): Promise<WhatsAppConnection[]> {
  const admin = useSupabaseAdmin()
  const { data } = await admin
    .from('whatsapp_connections')
    .select(SELECT_COLS)
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })
  return (data as WhatsAppConnection[] | null) ?? []
}

async function resolveConnection(opts: {
  connectionId?: string
  companyId?: string
}): Promise<WhatsAppConnection | null> {
  if (opts.connectionId) {
    const c = await getConnectionById(opts.connectionId)
    if (c) return c
  }
  if (opts.companyId) return await getPrincipalConnection(opts.companyId)
  return null
}

function toRemoteJid(input: string): string {
  if (input.includes('@')) return input
  const digits = input.replace(/\D/g, '')
  if (!digits) throw new Error('Número WhatsApp inválido.')
  return `${digits}@s.whatsapp.net`
}

export async function sendEvolutionText(opts: {
  conn: WhatsAppConnection
  to: string
  text: string
}): Promise<{ ok: boolean; messageId: string | null }> {
  const config = useRuntimeConfig()
  const baseUrl = (config.evoApiUrl as string).replace(/\/$/, '')
  const globalApiKey = config.evoGlobalApiKey as string

  if (!baseUrl) throw new Error('EVO_API_URL ausente no .env.')
  if (!opts.conn.instance_name) throw new Error('Instância Evolution não encontrada.')
  if (!opts.conn.is_connected && opts.conn.connection_status !== 'open') {
    throw new Error('Conexão Evolution não está ativa.')
  }

  const apikey = opts.conn.apikey_evo ?? globalApiKey
  if (!apikey) throw new Error('apikey Evolution ausente.')

  const remoteJid = toRemoteJid(opts.to)
  const numberDigits = remoteJid.split('@')[0]
  const url = `${baseUrl}/message/sendText/${encodeURIComponent(opts.conn.instance_name)}`
  try {
    const res = await $fetch<EvoSendTextResponse>(url, {
      method: 'POST',
      headers: { apikey, 'content-type': 'application/json' },
      body: { number: numberDigits, text: opts.text },
    })
    return { ok: true, messageId: res.key?.id ?? null }
  } catch (err) {
    const e = err as { data?: { message?: string }; message?: string; statusCode?: number }
    throw new Error(
      `Evolution sendText falhou: ${e.data?.message ?? e.message ?? `HTTP ${e.statusCode}`}`,
    )
  }
}

export async function sendCloudApiText(_opts: {
  conn: WhatsAppConnection
  to: string
  text: string
}): Promise<{ ok: boolean; messageId: string | null }> {
  throw new Error('Cloud API (Meta) ainda não implementada.')
}

export async function sendUazapiText(_opts: {
  conn: WhatsAppConnection
  to: string
  text: string
}): Promise<{ ok: boolean; messageId: string | null }> {
  throw new Error('uazapi ainda não implementada.')
}

export async function sendWhatsappText(opts: {
  connectionId?: string
  companyId?: string
  to: string
  text: string
}): Promise<{ ok: boolean; messageId: string | null; provider: ChannelType; connection_id: string }> {
  const conn = await resolveConnection({ connectionId: opts.connectionId, companyId: opts.companyId })
  if (!conn) throw new Error('Conexão WhatsApp não encontrada.')

  const dispatch =
    conn.provider === 'whatsapp_cloud'
      ? sendCloudApiText
      : conn.provider === 'whatsapp_uazapi'
        ? sendUazapiText
        : conn.provider === 'whatsapp_evolution'
          ? sendEvolutionText
          : null

  if (!dispatch) {
    throw new Error(`Envio via ${conn.provider} não suportado.`)
  }

  const r = await dispatch({ conn, to: opts.to, text: opts.text })
  return { ...r, provider: conn.provider, connection_id: conn.id }
}
