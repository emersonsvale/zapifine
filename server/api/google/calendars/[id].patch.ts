import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import type { Database } from '~~/types/database'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'
import { registerCalendarWatch, unregisterCalendarWatch } from '~~/server/utils/google-watch'

type Body = { selected?: boolean; default_write?: boolean }
type CalendarPatch = Database['public']['Tables']['google_calendars']['Update']

export default defineEventHandler(async (event) => {
  const authUser = await serverSupabaseUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
  }
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id obrigatório.' })
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

  const body = await readBody<Body>(event)
  const admin = useSupabaseAdmin()

  const { data: cal, error: cErr } = await admin
    .from('google_calendars')
    .select('id, integration_id, access_role')
    .eq('id', id)
    .maybeSingle()
  if (cErr || !cal) {
    throw createError({ statusCode: 404, statusMessage: 'Calendário não encontrado.' })
  }

  const { data: integ } = await admin
    .from('google_integrations')
    .select('user_id, companie_id')
    .eq('id', cal.integration_id)
    .maybeSingle()
  if (!integ || integ.companie_id !== me.companie_id) {
    throw createError({ statusCode: 404, statusMessage: 'Calendário não encontrado.' })
  }
  if (integ.user_id !== authUser.id && me.funcao_user !== 'OWNER') {
    throw createError({ statusCode: 403, statusMessage: 'Sem permissão.' })
  }

  const patch: CalendarPatch = {}

  if (typeof body.selected === 'boolean') {
    patch.selected = body.selected
  }

  if (body.default_write === true) {
    if (cal.access_role === 'reader' || cal.access_role === 'freeBusyReader') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Calendário somente leitura não pode ser padrão de escrita.',
      })
    }
    // Zera outros default_write da mesma integration
    await admin
      .from('google_calendars')
      .update({ default_write: false })
      .eq('integration_id', cal.integration_id)
      .neq('id', id)
    patch.default_write = true
  } else if (body.default_write === false) {
    patch.default_write = false
  }

  if (Object.keys(patch).length === 0) {
    return { ok: true, id, changed: false }
  }

  const { error: upErr } = await admin
    .from('google_calendars')
    .update(patch)
    .eq('id', id)
  if (upErr) {
    throw createError({ statusCode: 500, statusMessage: upErr.message })
  }

  // Sincroniza watch com nova seleção
  if (typeof body.selected === 'boolean') {
    if (body.selected) {
      registerCalendarWatch(id).catch(() => {})
    } else {
      unregisterCalendarWatch(id).catch(() => {})
    }
  }

  return { ok: true, id, changed: true }
})
