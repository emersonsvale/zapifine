import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

// Worker de expiração de mídia do storage. Mesmo contrato dos outros ticks
// internos (protegido por CRON_SECRET, chamado por cron externo 1x/dia).
//
// Regra: todo arquivo do bucket `chat-media` só fica 90 dias (3 meses). Depois
// é excluído pra minimizar custo; a mensagem continua na thread marcada como
// midia_expirada=true (o front mostra "Arquivo expirado").
const RETENTION_DAYS = 90
const MAX_BATCH = 500
const REMOVE_CHUNK = 100
const BUCKET = 'chat-media'
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`

type Row = { id: number; midia_url: string | null }

/** Extrai o path relativo ao bucket a partir da URL pública do storage. */
function storagePathFromUrl(url: string): string | null {
  const i = url.indexOf(PUBLIC_MARKER)
  if (i === -1) return null
  const path = url.slice(i + PUBLIC_MARKER.length).split('?')[0]
  return path ? decodeURIComponent(path) : null
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const expected = config.cronSecret as string
  if (!expected) {
    throw createError({ statusCode: 503, statusMessage: 'CRON_SECRET ausente no .env.' })
  }

  const got =
    getHeader(event, 'x-cron-secret')
    ?? (getHeader(event, 'authorization')?.replace(/^Bearer\s+/i, '') ?? '')
  if (got !== expected) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado.' })
  }

  const admin = useSupabaseAdmin()
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Só linhas cujo midia_url aponta pro storage `chat-media` (evita apagar
  // midia_url de links, que guardam URL externa).
  const { data, error } = await admin
    .from('whats_mensagens_conversa')
    .select('id, midia_url')
    .not('midia_url', 'is', null)
    .ilike('midia_url', `%${PUBLIC_MARKER}%`)
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(MAX_BATCH)
    .returns<Row[]>()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data?.length) {
    return { ok: true, scanned: 0, removed: 0, expired: 0, failed: 0 }
  }

  const pathToId = new Map<string, number>()
  for (const r of data) {
    if (!r.midia_url) continue
    const path = storagePathFromUrl(r.midia_url)
    if (path) pathToId.set(path, r.id)
  }
  const paths = Array.from(pathToId.keys())

  let removed = 0
  let failed = 0
  const okIds: number[] = []

  for (const group of chunk(paths, REMOVE_CHUNK)) {
    const { data: rmData, error: rmErr } = await admin.storage.from(BUCKET).remove(group)
    if (rmErr) {
      // Falha no lote: não marca como expirado, tenta de novo no próximo tick.
      failed += group.length
      console.error('[storage/purge] remove falhou', rmErr.message)
      continue
    }
    // `remove` é idempotente: objeto já ausente também conta como purgado.
    removed += rmData?.length ?? 0
    for (const p of group) {
      const id = pathToId.get(p)
      if (id != null) okIds.push(id)
    }
  }

  // Marca as mensagens purgadas: zera a URL e sinaliza expiração.
  let expired = 0
  for (const group of chunk(okIds, 200)) {
    const { error: updErr, count } = await admin
      .from('whats_mensagens_conversa')
      .update({ midia_url: null, midia_expirada: true, midia_pendente: false } as never, {
        count: 'exact',
      })
      .in('id', group)
    if (updErr) {
      console.error('[storage/purge] update falhou', updErr.message)
      continue
    }
    expired += count ?? group.length
  }

  return { ok: true, scanned: data.length, removed, expired, failed }
})
