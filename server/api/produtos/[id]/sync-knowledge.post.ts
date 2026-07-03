import { requireCurrentUser } from '~~/server/utils/auth-company'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'
import { callWhatsApi } from '~~/server/utils/whats-api'

type Produto = {
  id: number
  nome: string | null
  descricao: string | null
  preco: number | null
  exibir_preco: boolean | null
  ativo: boolean | null
  companies_id: string | null
}

function buildContent(p: Produto): string {
  const parts: string[] = []
  const nome = (p.nome ?? '').trim() || `Produto ${p.id}`
  parts.push(`Produto/Serviço: ${nome}`)
  const desc = p.descricao?.trim()
  if (desc) parts.push(`Descrição: ${desc}`)
  if (p.preco != null && p.exibir_preco) {
    const preco = `R$ ${p.preco.toFixed(2).replace('.', ',')}`
    parts.push(`Preço: ${preco}`)
  } else if (p.preco != null) {
    parts.push('Preço: sob consulta')
  }
  parts.push(
    'Este produto está no catálogo da empresa; a IA pode citá-lo em atendimentos quando for pertinente.',
  )
  return parts.join('\n')
}

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'id inválido' })
  }

  const admin = useSupabaseAdmin()
  const { data } = await admin
    .from('produtos')
    .select('id, nome, descricao, preco, exibir_preco, ativo, companies_id')
    .eq('id', id)
    .maybeSingle()

  const p = data as Produto | null
  const source_ref = `produto:${id}`

  await callWhatsApi(event, `/ai-knowledge/${encodeURIComponent(source_ref)}`, {
    method: 'DELETE',
    query: { company_id: user.companie_id },
  }).catch(() => null)

  if (!p) return { ok: true, removed: true }
  if (p.companies_id !== user.companie_id) {
    throw createError({ statusCode: 404, statusMessage: 'Produto não encontrado.' })
  }
  if (!p.ativo) return { ok: true, removed: true }

  const content_text = buildContent(p)
  const nome = (p.nome ?? '').trim() || `Produto ${p.id}`

  return await callWhatsApi(event, '/ai-knowledge', {
    method: 'POST',
    body: {
      company_id: user.companie_id,
      source_type: 'produto',
      source_ref,
      title: `Produto — ${nome}`,
      content_text,
    },
  })
})
