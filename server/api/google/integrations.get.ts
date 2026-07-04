import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import type { Database } from '~~/types/database'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

type Scope = 'me' | 'company'

export default defineEventHandler(async (event) => {
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

  const query = getQuery(event)
  const scope: Scope = query.scope === 'company' && me.funcao_user === 'OWNER' ? 'company' : 'me'

  const admin = useSupabaseAdmin()
  const q = admin
    .from('google_integrations')
    .select('id, user_id, companie_id, gg_email, scopes, created_at, updated_at')
    .is('revoked_at', null)

  const { data: integs, error } = scope === 'company'
    ? await q.eq('companie_id', me.companie_id)
    : await q.eq('user_id', authUser.id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const ids = (integs ?? []).map((i) => i.id)
  if (ids.length === 0) {
    return { integrations: [] }
  }

  const { data: cals } = await admin
    .from('google_calendars')
    .select('id, integration_id, gg_calendar_id, summary, description, time_zone, primary_flag, access_role, selected, default_write, color_hex, synced_at')
    .in('integration_id', ids)
    .order('primary_flag', { ascending: false })
    .order('summary', { ascending: true })

  const byInteg = new Map<string, unknown[]>()
  for (const c of cals ?? []) {
    const arr = byInteg.get(c.integration_id) ?? []
    arr.push(c)
    byInteg.set(c.integration_id, arr)
  }

  return {
    integrations: (integs ?? []).map((i) => ({
      ...i,
      is_mine: i.user_id === authUser.id,
      calendars: byInteg.get(i.id) ?? [],
    })),
  }
})
