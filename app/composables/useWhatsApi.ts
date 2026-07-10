// Cliente HTTP para zapifine-whats-api (Hono em whats.zapifine.com).
// Substitui supabase.functions.invoke('send_whatsapp_*') após Fase 1.

type SendResult = {
  ok: boolean
  _messageId: string | null
  raw?: unknown
  error?: string
  detail?: unknown
}

type SendTextPayload = {
  company_id: string
  number: string
  text: string
  delay?: number
  quoted_message_id?: string
  quoted_chat?: string
  mentioned?: string[]
  mentions_everyone?: boolean
  conversa_id?: number
  pause_ai?: boolean
}

type SendMediaPayload = {
  company_id: string
  number: string
  url: string
  caption?: string
  filename?: string
  mimetype?: string
  mediaType?: 'image' | 'video' | 'audio' | 'document'
}

type SendLinkPayload = {
  company_id: string
  number: string
  url: string
  text?: string
  title?: string
  description?: string
}

type SendLocationPayload = {
  company_id: string
  number: string
  latitude: number
  longitude: number
  name?: string
}

type SendContactPayload = {
  company_id: string
  number: string
  contacts: unknown[]
}

type SendPollPayload = {
  company_id: string
  number: string
  name: string
  options: string[]
}

type ReactPayload = {
  company_id: string
  number: string
  messageId: string
  reaction: string
}

type EditPayload = {
  company_id: string
  chat: string
  message: string
  messageId: string
}

type DeletePayload = {
  company_id: string
  chat: string
  messageId: string
}

type TriggerFlowPayload = {
  company_id: string
  flow_id: string
  conversa_id: number
  lead_id?: number | null
  remote_jid?: string | null
  connection_id?: string
}

export function useWhatsApi() {
  const config = useRuntimeConfig()
  const base = (config.public.whatsApiUrl as string) || 'https://whats.zapifine.com'

  async function call(path: string, body: unknown): Promise<SendResult> {
    try {
      const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json().catch(() => ({}))) as SendResult
      if (!res.ok) {
        const message = json?.error ?? `HTTP ${res.status}`
        throw new Error(message)
      }
      return json
    } catch (err) {
      throw err instanceof Error ? err : new Error('Falha na API WhatsApp')
    }
  }

  return {
    sendText: (p: SendTextPayload) => call('/send/text', p),
    sendMedia: (p: SendMediaPayload) => call('/send/media', p),
    sendLink: (p: SendLinkPayload) => call('/send/link', p),
    sendLocation: (p: SendLocationPayload) => call('/send/location', p),
    sendContact: (p: SendContactPayload) => call('/send/contact', p),
    sendPoll: (p: SendPollPayload) => call('/send/poll', p),
    react: (p: ReactPayload) => call('/send/react', p),
    edit: (p: EditPayload) => call('/send/edit', p),
    del: (p: DeletePayload) => call('/send/delete', p),
    triggerFlow: (p: TriggerFlowPayload) => call('/flow/manual-trigger', p),
  }
}
