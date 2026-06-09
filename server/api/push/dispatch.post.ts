import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'
import { getWebPush } from '~~/server/utils/web-push'

type DispatchBody = {
  message_id?: number
  conversa_id?: number | null
  tipo?: string | null
  mensagem?: string | null
}

type Subscription = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

function previewOf(mensagem: string | null | undefined, tipo: string | null | undefined): string {
  const txt = mensagem?.trim()
  if (txt) return txt.length > 120 ? txt.slice(0, 117) + '...' : txt
  const t = (tipo || '').toLowerCase()
  if (t.includes('image') || t === 'imagem') return '📷 Imagem'
  if (t.includes('video')) return '🎬 Vídeo'
  if (t.includes('audio') || t === 'audio') return '🎙️ Áudio'
  if (t === 'location' || t === 'localizacao') return '📍 Localização'
  if (t === 'contact' || t === 'contato') return '👤 Contato'
  if (t === 'poll' || t === 'enquete') return '📊 Enquete'
  if (t.includes('document') || t === 'documento') return '📎 Documento'
  if (t === 'link') return '🔗 Link'
  return '[mídia]'
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const headerSecret = getHeader(event, 'x-zapifine-cron')
  if (!config.cronSecret || headerSecret !== config.cronSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<DispatchBody>(event)
  const convId = body.conversa_id ?? null
  if (!convId) return { ok: true, skipped: 'no conversa_id' }

  const admin = useSupabaseAdmin()

  const { data: conv } = await admin
    .from('whats_conversa')
    .select(
      'companies_id, isgrupo, "grupoNome", "remoteJid", leads(nome_lead, numero_whatsapp_lead)' as never,
    )
    .eq('id', convId)
    .maybeSingle()

  const c = conv as unknown as {
    companies_id?: string | null
    isgrupo?: boolean
    grupoNome?: string | null
    remoteJid?: string | null
    leads?: { nome_lead?: string | null; numero_whatsapp_lead?: string | null } | null
  } | null

  if (!c?.companies_id) return { ok: true, skipped: 'no company' }

  const title = c.isgrupo
    ? c.grupoNome?.trim() || 'Grupo'
    : c.leads?.nome_lead?.trim() || c.leads?.numero_whatsapp_lead || c.remoteJid || 'WhatsApp'

  const message = previewOf(body.mensagem, body.tipo)

  const { data: subs } = await admin
    .from('push_subscriptions' as never)
    .select('id, user_id, endpoint, p256dh, auth')
    .eq('company_id', c.companies_id)

  const subscriptions = (subs as unknown as Subscription[] | null) ?? []
  if (!subscriptions.length) return { ok: true, sent: 0 }

  const webpush = getWebPush()
  const payload = JSON.stringify({
    title,
    body: message,
    convId,
    url: `/multiatendimento/chats?conv=${convId}`,
    tag: `chat-${convId}`,
  })

  const expired: string[] = []
  let sent = 0

  await Promise.all(
    subscriptions.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payload,
          { TTL: 60 },
        )
        sent++
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) expired.push(s.id)
      }
    }),
  )

  if (expired.length) {
    await admin.from('push_subscriptions' as never).delete().in('id', expired)
  }

  return { ok: true, sent, removed: expired.length }
})
