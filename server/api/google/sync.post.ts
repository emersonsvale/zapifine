import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import type { Database } from '~~/types/database'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'
import { syncIntegration } from '~~/server/utils/google-sync'

type Body = { integration_id?: string; scope?: 'me' | 'company' }

export default defineEventHandler(async (event) => {
  try {
    return await handleSync(event)
  } catch (err) {
    const e = err as { statusCode?: number; statusMessage?: string; message?: string; stack?: string }
    console.error('[api/google/sync] error:', e.statusMessage ?? e.message, e.stack)
    if (e.statusCode) throw err
    const firstStackLine = (e.stack ?? '').split('\n').slice(0, 4).join(' | ')
    throw createError({
      statusCode: 500,
      statusMessage: `sync erro: ${e.message ?? String(err)} @ ${firstStackLine}`,
    })
  }
})

async function handleSync(event: Parameters<Parameters<typeof defineEventHandler>[0]>[0]) {
  const authUser = await serverSupabaseUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
  }

  const supa = await serverSupabaseClient<Database>(event)
  const { data: me } = await supa
    .from('users')
    .select('companie_id, funcao_user')
    .eq('id', authUser.id)
    .maybeSingle()
  if (!me?.companie_id) {
    throw createError({ statusCode: 403, statusMessage: 'Sem empresa vinculada.' })
  }

  const body = await readBody<Body>(event).catch(() => ({} as Body))
  const admin = useSupabaseAdmin()

  let integrationIds: string[] = []

  if (body.integration_id) {
    const { data: integ } = await admin
      .from('google_integrations')
      .select('id, user_id, companie_id')
      .eq('id', body.integration_id)
      .is('revoked_at', null)
      .maybeSingle()
    if (!integ || integ.companie_id !== me.companie_id) {
      throw createError({ statusCode: 404, statusMessage: 'Integração não encontrada.' })
    }
    if (integ.user_id !== authUser.id && me.funcao_user !== 'OWNER') {
      throw createError({ statusCode: 403, statusMessage: 'Sem permissão para sincronizar esta integração.' })
    }
    integrationIds = [integ.id]
  } else if (body.scope === 'company' && me.funcao_user === 'OWNER') {
    const { data: list } = await admin
      .from('google_integrations')
      .select('id')
      .eq('companie_id', me.companie_id)
      .is('revoked_at', null)
    integrationIds = (list ?? []).map((r) => r.id)
  } else {
    // default: minhas integrations
    const { data: list } = await admin
      .from('google_integrations')
      .select('id')
      .eq('user_id', authUser.id)
      .is('revoked_at', null)
    integrationIds = (list ?? []).map((r) => r.id)
  }

  if (integrationIds.length === 0) {
    return { ok: true, integrations: [], upserted: 0, cancelled: 0, full_resync: false, fetched: 0 }
  }

  const results = []
  let upserted = 0
  let cancelled = 0
  let fetched = 0
  let fullResync = false

  for (const id of integrationIds) {
    try {
      const stats = await syncIntegration(id)
      for (const c of stats.calendars) {
        upserted += c.upserted
        cancelled += c.cancelled
        fetched += c.fetched
        if (c.full_resync) fullResync = true
      }
      results.push({ integration_id: id, ok: true, calendars: stats.calendars.length })
    } catch (err) {
      results.push({
        integration_id: id,
        ok: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido.',
      })
    }
  }

  return {
    ok: true,
    integrations: results,
    upserted,
    cancelled,
    fetched,
    full_resync: fullResync,
    next_sync_token: null,
  }
}
