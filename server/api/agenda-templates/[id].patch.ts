import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

type Body = {
  title?: string | null
  body?: string
  ativo?: boolean
  minutes_before?: number | null
}

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  if (me.funcao !== 'OWNER') {
    throw createError({ statusCode: 403, statusMessage: 'Apenas o dono.' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id obrigatório.' })

  const admin = useSupabaseAdmin()
  const { data: existing } = await admin
    .from('agenda_templates')
    .select('id, companie_id')
    .eq('id', id)
    .maybeSingle()

  if (!existing || existing.companie_id !== me.companieId) {
    throw createError({ statusCode: 404, statusMessage: 'Template não encontrado.' })
  }

  const body = await readBody<Body>(event)
  const patch: Record<string, unknown> = {}
  if (body.title !== undefined) patch.title = body.title?.trim() || null
  if (body.body !== undefined) {
    const text = body.body.trim()
    if (!text) throw createError({ statusCode: 400, statusMessage: 'body vazio.' })
    patch.body = text
  }
  if (body.ativo !== undefined) patch.ativo = body.ativo
  if (body.minutes_before !== undefined) patch.minutes_before = body.minutes_before

  const { error } = await admin
    .from('agenda_templates')
    .update(patch)
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true, id }
})
