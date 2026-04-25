import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

type Body = {
  channel?: 'app' | 'whatsapp'
  kind?: 'lembrete' | 'confirmacao' | 'cancelamento' | 'novo_agendamento'
  minutes_before?: number | null
  title?: string | null
  body?: string
  ativo?: boolean
}

const VALID_CHANNELS = ['app', 'whatsapp']
const VALID_KINDS = ['lembrete', 'confirmacao', 'cancelamento', 'novo_agendamento']

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  if (me.funcao !== 'OWNER') {
    throw createError({ statusCode: 403, statusMessage: 'Apenas o dono pode editar templates.' })
  }

  const body = await readBody<Body>(event)
  if (!body.channel || !VALID_CHANNELS.includes(body.channel)) {
    throw createError({ statusCode: 400, statusMessage: 'channel inválido.' })
  }
  if (!body.kind || !VALID_KINDS.includes(body.kind)) {
    throw createError({ statusCode: 400, statusMessage: 'kind inválido.' })
  }
  const text = body.body?.trim()
  if (!text) {
    throw createError({ statusCode: 400, statusMessage: 'body obrigatório.' })
  }

  const admin = useSupabaseAdmin()
  const { data, error } = await admin
    .from('agenda_templates')
    .insert({
      companie_id: me.companieId,
      channel: body.channel,
      kind: body.kind,
      minutes_before: body.minutes_before ?? null,
      title: body.title?.trim() || null,
      body: text,
      ativo: body.ativo ?? true,
    })
    .select('*')
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  return { template: data }
})
