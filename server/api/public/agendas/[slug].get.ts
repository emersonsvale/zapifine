import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

/**
 * Retorna metadados da página pública e atendentes disponíveis.
 * Endpoint público, sem auth.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug obrigatório.' })

  const admin = useSupabaseAdmin()
  const { data: company, error } = await admin
    .from('companies')
    .select('id, name, agenda_publico_slug, agenda_publico_ativo, agenda_publico_titulo, agenda_publico_descricao, logo_url')
    .eq('agenda_publico_slug', slug)
    .maybeSingle()

  if (error || !company) {
    throw createError({ statusCode: 404, statusMessage: 'Agenda pública não encontrada.' })
  }
  if (!company.agenda_publico_ativo) {
    throw createError({ statusCode: 404, statusMessage: 'Agenda pública desativada.' })
  }

  // Atendentes com pelo menos 1 horário cadastrado
  type UserLite = { id: string; nome: string | null; foto_perfil: string | null }
  const { data: members } = await admin
    .from('users')
    .select('id, nome, foto_perfil, status, agenda_horarios_semanal!inner(id)')
    .eq('companie_id', company.id)
    .neq('status', 'Desativado')
    .returns<UserLite[]>()

  const seen = new Set<string>()
  const uniqueMembers: Array<{ id: string; nome: string | null; foto_perfil: string | null }> = []
  for (const m of members ?? []) {
    if (seen.has(m.id)) continue
    seen.add(m.id)
    uniqueMembers.push({ id: m.id, nome: m.nome, foto_perfil: m.foto_perfil })
  }

  return {
    company: {
      id: company.id,
      name: company.name,
      logo_url: company.logo_url,
      titulo: company.agenda_publico_titulo,
      descricao: company.agenda_publico_descricao,
    },
    members: uniqueMembers,
  }
})
