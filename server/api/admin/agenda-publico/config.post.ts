import { requireMembership } from '~~/server/utils/agendamentos-helpers'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

type Body = {
  agenda_publico_slug?: string | null
  agenda_publico_ativo?: boolean
  agenda_publico_titulo?: string | null
  agenda_publico_descricao?: string | null
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/

export default defineEventHandler(async (event) => {
  const me = await requireMembership(event)
  if (me.funcao !== 'OWNER') {
    throw createError({ statusCode: 403, statusMessage: 'Apenas o dono.' })
  }

  const body = await readBody<Body>(event)
  const patch: Record<string, unknown> = {}

  if (body.agenda_publico_slug !== undefined) {
    if (body.agenda_publico_slug === null || body.agenda_publico_slug === '') {
      patch.agenda_publico_slug = null
    } else {
      const slug = body.agenda_publico_slug.trim().toLowerCase()
      if (!SLUG_RE.test(slug)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Slug deve ter 2-40 caracteres: letras minúsculas, números e hífen (não no início/fim).',
        })
      }

      // Verifica unicidade
      const admin = useSupabaseAdmin()
      const { data: exists } = await admin
        .from('companies')
        .select('id')
        .eq('agenda_publico_slug', slug)
        .neq('id', me.companieId)
        .maybeSingle()
      if (exists) {
        throw createError({ statusCode: 409, statusMessage: 'Slug já em uso por outra empresa.' })
      }
      patch.agenda_publico_slug = slug
    }
  }

  if (body.agenda_publico_ativo !== undefined) {
    patch.agenda_publico_ativo = !!body.agenda_publico_ativo
  }
  if (body.agenda_publico_titulo !== undefined) {
    patch.agenda_publico_titulo = body.agenda_publico_titulo?.trim() || null
  }
  if (body.agenda_publico_descricao !== undefined) {
    patch.agenda_publico_descricao = body.agenda_publico_descricao?.trim() || null
  }

  const admin = useSupabaseAdmin()
  const { error } = await admin
    .from('companies')
    .update(patch)
    .eq('id', me.companieId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
