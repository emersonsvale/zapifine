import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'
import { syncIntegration } from '~~/server/utils/google-sync'
import { registerCalendarWatch } from '~~/server/utils/google-watch'

const STALE_AFTER_MIN = 5
const BATCH_LIMIT = 100

export default defineEventHandler(async (event) => {
  const expected = process.env.CRON_SECRET ?? ''
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
  const cutoff = new Date(Date.now() - STALE_AFTER_MIN * 60_000).toISOString()

  // Pega integrations com pelo menos 1 calendar selected e algum synced_at antigo (ou nunca sincronizado).
  // Estratégia: pega todas ativas; syncIntegration itera calendars selecionados internamente.
  const { data: integs, error } = await admin
    .from('google_integrations')
    .select('id, updated_at')
    .is('revoked_at', null)
    .limit(BATCH_LIMIT)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  // Filtra por integrations que têm algum calendar selected com synced_at velho ou null
  const ids: string[] = []
  for (const i of integs ?? []) {
    const { data: stale } = await admin
      .from('google_calendars')
      .select('id')
      .eq('integration_id', i.id)
      .eq('selected', true)
      .or(`synced_at.is.null,synced_at.lt.${cutoff}`)
      .limit(1)
    if (stale && stale.length > 0) ids.push(i.id)
  }

  const results: Array<{
    integrationId: string
    ok: boolean
    calendars?: number
    upserted?: number
    cancelled?: number
    full_resync?: boolean
    error?: string
  }> = []

  for (const id of ids) {
    try {
      const stats = await syncIntegration(id)
      const totalUpserted = stats.calendars.reduce((s, c) => s + c.upserted, 0)
      const totalCancelled = stats.calendars.reduce((s, c) => s + c.cancelled, 0)
      const anyFullResync = stats.calendars.some((c) => c.full_resync)
      results.push({
        integrationId: id,
        ok: true,
        calendars: stats.calendars.length,
        upserted: totalUpserted,
        cancelled: totalCancelled,
        full_resync: anyFullResync,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.'
      results.push({ integrationId: id, ok: false, error: msg })
    }
  }

  // Renova watches expirando nas próximas 24h (registerCalendarWatch encerra o antigo)
  const renewCutoff = new Date(Date.now() + 24 * 3600_000).toISOString()
  const { data: expiring } = await admin
    .from('google_calendars')
    .select('id')
    .eq('selected', true)
    .not('watch_channel_id', 'is', null)
    .lt('watch_expires_at', renewCutoff)
    .limit(50)
  const renewed = (expiring ?? []).length
  for (const c of expiring ?? []) {
    await registerCalendarWatch(c.id).catch(() => {})
  }

  return {
    ok: true,
    processed: results.length,
    results,
    watches_renewed: renewed,
  }
})
