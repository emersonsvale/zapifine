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
}

function buildContent(p: Produto): string {
  const parts: string[] = []
  const nome = (p.nome ?? '').trim() || `Produto ${p.id}`
  parts.push(`Produto/Serviço: ${nome}`)
  const desc = p.descricao?.trim()
  if (desc) parts.push(`Descrição: ${desc}`)
  if (p.preco != null && p.exibir_preco) {
    parts.push(`Preço: R$ ${p.preco.toFixed(2).replace('.', ',')}`)
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
  const admin = useSupabaseAdmin()

  const { data } = await admin
    .from('produtos')
    .select('id, nome, descricao, preco, exibir_preco, ativo')
    .eq('companies_id', user.companie_id)

  const list = (data as Produto[] | null) ?? []
  let synced = 0
  let removed = 0
  const errors: Array<{ id: number; error: string }> = []

  for (const p of list) {
    const source_ref = `produto:${p.id}`
    try {
      await callWhatsApi(event, `/ai-knowledge/${encodeURIComponent(source_ref)}`, {
        method: 'DELETE',
        query: { company_id: user.companie_id },
      }).catch(() => null)

      if (!p.ativo) {
        removed++
        continue
      }

      const nome = (p.nome ?? '').trim() || `Produto ${p.id}`
      await callWhatsApi(event, '/ai-knowledge', {
        method: 'POST',
        body: {
          company_id: user.companie_id,
          source_type: 'produto',
          source_ref,
          title: `Produto — ${nome}`,
          content_text: buildContent(p),
        },
      })
      synced++
    } catch (err) {
      errors.push({ id: p.id, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return { ok: true, total: list.length, synced, removed, errors }
})
