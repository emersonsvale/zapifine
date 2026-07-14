import type { Database } from '~~/types/database'
import type { FlowSummary } from './useFlows'

export type FlowColumnOption = { id: number; nome: string; role: string | null }
type ColumnRow = { id: number; nome_coluna: string | null; role?: string | null }
export type FlowUserOption = { id: string; nome: string | null; email: string | null }
export type FlowFlowOption = { id: string; name: string; status: string }
export type FlowConnectionOption = { id: string; display_name: string | null; provider: string }

export function useFlowBuilderOptions() {
  const supabase = useSupabaseClient<Database>()
  const authUser = useSupabaseUser()

  const columns = ref<FlowColumnOption[]>([])
  const users = ref<FlowUserOption[]>([])
  const tags = ref<string[]>([])
  const flows = ref<FlowFlowOption[]>([])
  const connections = ref<FlowConnectionOption[]>([])
  const pending = ref(false)

  async function load(excludeFlowId?: string | null) {
    if (!authUser.value?.id) return
    pending.value = true
    try {
      const { data: userCtx } = await supabase
        .from('users')
        .select('companie_id, companies:companie_id(funil_incial_id)')
        .eq('id', authUser.value.id)
        .maybeSingle()
      const companyId = userCtx?.companie_id ?? null
      const funilId =
        ((userCtx?.companies as { funil_incial_id?: number | null } | null) ?? null)
          ?.funil_incial_id ?? null

      const [colsRes, usersRes, tagsRes, flowsRes, connsRes] = await Promise.all([
        funilId
          ? supabase
              .from('ff_colunas_funil')
              .select('id, nome_coluna, role' as never)
              .eq('funil_id', funilId)
              .order('id', { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        companyId
          ? supabase
              .from('users')
              .select('id, nome, email')
              .eq('companie_id', companyId)
              .order('nome', { ascending: true, nullsFirst: false })
          : Promise.resolve({ data: [], error: null }),
        companyId
          ? supabase
              .from('leads')
              .select('tags')
              .eq('companies_id', companyId)
              .not('tags', 'is', null)
              .limit(500)
          : Promise.resolve({ data: [], error: null }),
        $fetch<{ flows: FlowSummary[] }>('/api/flows').catch(() => ({ flows: [] })),
        $fetch<{ connections: Array<{ id: string; display_name: string | null; provider: string }> }>('/api/connections').catch(() => ({ connections: [] })),
      ])

      columns.value = ((colsRes.data ?? []) as unknown as ColumnRow[]).map((c) => ({
        id: c.id,
        nome: c.nome_coluna ?? `#${c.id}`,
        role: c.role ?? null,
      }))
      users.value = ((usersRes.data ?? []) as FlowUserOption[])

      const tagSet = new Set<string>()
      for (const row of (tagsRes.data ?? []) as { tags: unknown }[]) {
        const arr = Array.isArray(row.tags) ? row.tags : []
        for (const t of arr) {
          const s = typeof t === 'string' ? t.trim() : ''
          if (s) tagSet.add(s)
        }
      }
      tags.value = Array.from(tagSet).sort((a, b) => a.localeCompare(b))

      flows.value = flowsRes.flows
        .filter((f) => f.id !== excludeFlowId && f.status !== 'archived')
        .map((f) => ({ id: f.id, name: f.name, status: f.status }))

      connections.value = (connsRes.connections ?? [])
        .filter((c) => c.provider === 'instagram' || c.provider === 'facebook')
        .map((c) => ({ id: c.id, display_name: c.display_name, provider: c.provider }))
    } finally {
      pending.value = false
    }
  }

  return { columns, users, tags, flows, connections, pending, load }
}
