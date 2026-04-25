import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'
import { syncCompanyEvents } from '~~/server/utils/google-sync'

const STALE_AFTER_MIN = 5

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
  const cutoff = new Date(Date.now() - STALE_AFTER_MIN * 60_000).toISOString()

  const { data: companies, error } = await admin
    .from('companies')
    .select('id, gg_synced_at')
    .not('gg_refresh_token', 'is', null)
    .not('gg_calendar_id', 'is', null)
    .or(`gg_synced_at.is.null,gg_synced_at.lt.${cutoff}`)
    .limit(50)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const results: Array<{
    companyId: string
    ok: boolean
    upserted?: number
    cancelled?: number
    full_resync?: boolean
    error?: string
  }> = []

  for (const c of companies ?? []) {
    try {
      const stats = await syncCompanyEvents(c.id)
      results.push({
        companyId: c.id,
        ok: true,
        upserted: stats.upserted,
        cancelled: stats.cancelled,
        full_resync: stats.full_resync,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.'
      results.push({ companyId: c.id, ok: false, error: msg })
    }
  }

  return {
    ok: true,
    processed: results.length,
    results,
  }
})
