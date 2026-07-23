import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'
import { sendViaWhatsApi } from '~~/server/utils/whats-api'
import type { Database } from '~~/types/database'

type MensagemInsert = Database['public']['Tables']['whats_mensagens_conversa']['Insert']

// Worker da fila de mensagens agendadas do chat. Mesmo contrato do
// /api/internal/lembretes/tick: protegido por CRON_SECRET, chamado por cron.
const MAX_BATCH = 50
const MAX_ATTEMPTS = 3

type AgendadaRow = {
  id: string
  companies_id: string
  conversa_id: number
  lead_id: number | null
  created_by: string | null
  tipo: 'text' | 'media' | 'link'
  mensagem: string | null
  midia_url: string | null
  midia_nome: string | null
  midia_mime: string | null
  midia_tipo: 'image' | 'video' | 'audio' | 'document' | null
  link_url: string | null
  link_titulo: string | null
  link_descricao: string | null
  scheduled_at: string
  attempts: number
}

type ConversaLite = {
  id: number
  remoteJid: string | null
  lead_id: number | null
  companies_id: string | null
  leads: { numero_whatsapp_lead: string | null } | null
}

function extractNumber(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (raw.includes('@')) {
    const left = raw.split('@')[0] ?? ''
    return /^\d+$/.test(left) ? left : null
  }
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

/** Mesma assinatura aplicada nos envios manuais (useChats.buildPrefixed). */
function buildPrefixed(text: string, nome: string | null, cargo: string | null): string {
  const n = nome?.trim()
  const c = cargo?.trim()
  if (!n || !c) return text
  return `*${n} - ${c}*\n\n${text}`
}

/**
 * O que fica gravado na thread. Para texto usa o mesmo conteúdo que foi pro
 * WhatsApp (já com a assinatura), igual ao envio manual do useChats.
 */
function previewFor(row: AgendadaRow, textoEnviado: string): {
  tipo: string
  mensagem: string
  midia_url: string | null
} {
  if (row.tipo === 'media') {
    return {
      tipo: row.midia_tipo ?? 'midia',
      mensagem: row.mensagem ?? row.midia_nome ?? '[mídia enviada]',
      midia_url: row.midia_url,
    }
  }
  if (row.tipo === 'link') {
    return {
      tipo: 'link',
      mensagem: row.mensagem ?? row.link_url ?? '[link]',
      midia_url: row.link_url,
    }
  }
  return { tipo: 'text', mensagem: textoEnviado, midia_url: null }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const expected = config.cronSecret as string
  if (!expected) {
    throw createError({
      statusCode: 503,
      statusMessage: 'CRON_SECRET ausente no .env.',
    })
  }

  const got =
    getHeader(event, 'x-cron-secret')
    ?? (getHeader(event, 'authorization')?.replace(/^Bearer\s+/i, '') ?? '')

  if (got !== expected) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado.' })
  }

  const admin = useSupabaseAdmin()
  const nowIso = new Date().toISOString()

  const { data: pending, error: pErr } = await admin
    .from('chat_mensagens_agendadas')
    .select(
      'id, companies_id, conversa_id, lead_id, created_by, tipo, mensagem, midia_url, midia_nome, midia_mime, midia_tipo, link_url, link_titulo, link_descricao, scheduled_at, attempts',
    )
    .eq('status', 'pending')
    .lte('scheduled_at', nowIso)
    .order('scheduled_at', { ascending: true })
    .limit(MAX_BATCH)
    .returns<AgendadaRow[]>()

  if (pErr) throw createError({ statusCode: 500, statusMessage: pErr.message })
  if (!pending?.length) {
    return { ok: true, processed: 0, sent: 0, failed: 0, skipped: 0 }
  }

  // Pré-fetch das conversas (número de destino) e das assinaturas dos autores.
  const convIds = Array.from(new Set(pending.map((p) => p.conversa_id)))
  const { data: convs } = await admin
    .from('whats_conversa')
    .select('id, "remoteJid", lead_id, companies_id, leads(numero_whatsapp_lead)')
    .in('id', convIds)
    .returns<ConversaLite[]>()
  const convMap = new Map<number, ConversaLite>((convs ?? []).map((c) => [c.id, c]))

  const userIds = Array.from(
    new Set(pending.map((p) => p.created_by).filter((v): v is string => !!v)),
  )
  const sigMap = new Map<string, { nome: string | null; cargo: string | null }>()
  if (userIds.length) {
    const { data: users } = await admin
      .from('users')
      .select('id, nome, cargo_chat')
      .in('id', userIds)
    for (const u of (users ?? []) as Array<{
      id: string
      nome: string | null
      cargo_chat: string | null
    }>) {
      sigMap.set(u.id, { nome: u.nome, cargo: u.cargo_chat })
    }
  }

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const row of pending) {
    const conv = convMap.get(row.conversa_id)
    const number =
      extractNumber(conv?.remoteJid)
      ?? extractNumber(conv?.leads?.numero_whatsapp_lead)

    if (!conv || !number) {
      await admin
        .from('chat_mensagens_agendadas')
        .update({
          status: 'failed',
          attempts: row.attempts + 1,
          last_error: 'Conversa ou número WhatsApp não encontrado.',
        })
        .eq('id', row.id)
      skipped++
      continue
    }

    try {
      const sig = row.created_by ? sigMap.get(row.created_by) : undefined
      let result: { _messageId?: string | null } = {}
      // Mesma assinatura do envio manual: *Nome - Cargo*\n\ntexto.
      const textoEnviado = buildPrefixed(
        (row.mensagem ?? '').trim(),
        sig?.nome ?? null,
        sig?.cargo ?? null,
      )

      if (row.tipo === 'text') {
        if (!textoEnviado) throw new Error('Mensagem vazia.')
        result = await sendViaWhatsApi('/send/text', {
          company_id: row.companies_id,
          number,
          text: textoEnviado,
          conversa_id: row.conversa_id,
          pause_ai: true,
        })
      } else if (row.tipo === 'media') {
        if (!row.midia_url) throw new Error('URL da mídia ausente.')
        result = await sendViaWhatsApi('/send/media', {
          company_id: row.companies_id,
          number,
          url: row.midia_url,
          ...(row.mensagem ? { caption: row.mensagem } : {}),
          ...(row.midia_nome ? { filename: row.midia_nome } : {}),
          ...(row.midia_mime ? { mimetype: row.midia_mime } : {}),
          ...(row.midia_tipo ? { mediaType: row.midia_tipo } : {}),
        })
      } else if (row.tipo === 'link') {
        if (!row.link_url) throw new Error('URL do link ausente.')
        result = await sendViaWhatsApi('/send/link', {
          company_id: row.companies_id,
          number,
          url: row.link_url,
          ...(row.mensagem ? { text: row.mensagem } : {}),
          ...(row.link_titulo ? { title: row.link_titulo } : {}),
          ...(row.link_descricao ? { description: row.link_descricao } : {}),
        })
      } else {
        throw new Error(`tipo desconhecido: ${row.tipo}`)
      }

      const messageId = result?._messageId ?? null
      const preview = previewFor(row, textoEnviado)

      // Registra na thread pra aparecer no chat (e no realtime dos atendentes).
      const msgRow: MensagemInsert = {
        whats_conversa_id: row.conversa_id,
        lead_id: row.lead_id ?? conv.lead_id ?? null,
        sender: row.created_by,
        mensagem: preview.mensagem,
        tipo: preview.tipo,
        midia_url: preview.midia_url,
        status: 'Enviada',
        id_mensagem: messageId,
      }
      const { error: insErr } = messageId
        ? await admin
            .from('whats_mensagens_conversa')
            .upsert(msgRow, { onConflict: 'id_mensagem', ignoreDuplicates: false })
        : await admin.from('whats_mensagens_conversa').insert(msgRow)
      if (insErr) {
        console.error('[mensagens-agendadas/tick] insert msg falhou', insErr)
      }

      await admin
        .from('chat_mensagens_agendadas')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          attempts: row.attempts + 1,
          id_mensagem: messageId,
          last_error: null,
        })
        .eq('id', row.id)
      sent++
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.'
      const newAttempts = row.attempts + 1
      await admin
        .from('chat_mensagens_agendadas')
        .update({
          status: newAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
          attempts: newAttempts,
          last_error: msg.slice(0, 500),
        })
        .eq('id', row.id)
      failed++
    }
  }

  return { ok: true, processed: pending.length, sent, failed, skipped }
})
