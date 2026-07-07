import type { Database } from '~~/types/database'

type LeadRow = Database['public']['Tables']['leads']['Row']

export type TagStat = {
  name: string
  count: number
}

function norm(s: string) {
  return s.trim().toLowerCase()
}

export function useTags() {
  const supabase = useSupabaseClient<Database>()
  const authUser = useSupabaseUser()

  const companyId = useState<string | null>('tags-company-id', () => null)

  async function loadCompanyId(): Promise<string | null> {
    if (companyId.value) return companyId.value
    if (!authUser.value?.id) return null
    const { data, error } = await supabase
      .from('users')
      .select('companie_id')
      .eq('id', authUser.value.id)
      .maybeSingle()
    if (error) return null
    companyId.value = data?.companie_id ?? null
    return companyId.value
  }

  async function fetchLeadsWithTags(): Promise<Pick<LeadRow, 'id' | 'tags'>[]> {
    const cid = await loadCompanyId()
    if (!cid) return []
    const { data, error } = await supabase
      .from('leads')
      .select('id, tags')
      .eq('companies_id', cid)
      .not('tags', 'is', null)
    if (error) throw error
    return (data ?? []) as Pick<LeadRow, 'id' | 'tags'>[]
  }

  const {
    data: stats,
    pending,
    refresh,
  } = useAsyncData<TagStat[]>(
    'tag-stats',
    async () => {
      const rows = await fetchLeadsWithTags()
      const counts = new Map<string, { name: string; count: number }>()
      for (const r of rows) {
        const tags = Array.isArray(r.tags) ? r.tags : []
        const seen = new Set<string>()
        for (const raw of tags) {
          if (typeof raw !== 'string') continue
          const t = raw.trim()
          if (!t) continue
          const key = norm(t)
          if (seen.has(key)) continue
          seen.add(key)
          const prev = counts.get(key)
          if (prev) prev.count += 1
          else counts.set(key, { name: t, count: 1 })
        }
      }
      return Array.from(counts.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR'),
      )
    },
    { watch: [() => authUser.value?.id], default: () => [] },
  )

  async function renameTag(from: string, to: string) {
    const src = from.trim()
    const dst = to.trim()
    if (!src || !dst) throw new Error('Tag inválida.')
    if (norm(src) === norm(dst)) return
    const cid = await loadCompanyId()
    if (!cid) throw new Error('Empresa não configurada.')

    const { data, error } = await supabase
      .from('leads')
      .select('id, tags')
      .eq('companies_id', cid)
      .contains('tags', [src])
    if (error) throw error

    const updates = (data ?? []).map((row) => {
      const current = Array.isArray(row.tags) ? row.tags : []
      const next: string[] = []
      const seen = new Set<string>()
      for (const raw of current) {
        if (typeof raw !== 'string') continue
        const t = norm(raw) === norm(src) ? dst : raw
        const key = norm(t)
        if (seen.has(key)) continue
        seen.add(key)
        next.push(t)
      }
      return supabase.from('leads').update({ tags: next }).eq('id', row.id)
    })

    const results = await Promise.all(updates)
    const failed = results.find((r) => r.error)
    if (failed?.error) throw failed.error
    await refresh()
  }

  async function deleteTag(name: string) {
    const t = name.trim()
    if (!t) return
    const cid = await loadCompanyId()
    if (!cid) throw new Error('Empresa não configurada.')

    const { data, error } = await supabase
      .from('leads')
      .select('id, tags')
      .eq('companies_id', cid)
      .contains('tags', [t])
    if (error) throw error

    const updates = (data ?? []).map((row) => {
      const current = Array.isArray(row.tags) ? row.tags : []
      const next = current.filter(
        (raw) => typeof raw === 'string' && norm(raw) !== norm(t),
      )
      return supabase.from('leads').update({ tags: next }).eq('id', row.id)
    })

    const results = await Promise.all(updates)
    const failed = results.find((r) => r.error)
    if (failed?.error) throw failed.error
    await refresh()
  }

  async function mergeTags(sources: string[], target: string) {
    const dst = target.trim()
    if (!dst) throw new Error('Tag destino inválida.')
    const srcs = sources.map((s) => s.trim()).filter(Boolean)
    if (srcs.length === 0) return
    const cid = await loadCompanyId()
    if (!cid) throw new Error('Empresa não configurada.')

    const srcSet = new Set(srcs.map(norm))

    const { data, error } = await supabase
      .from('leads')
      .select('id, tags')
      .eq('companies_id', cid)
      .overlaps('tags', srcs)
    if (error) throw error

    const updates = (data ?? []).map((row) => {
      const current = Array.isArray(row.tags) ? row.tags : []
      const next: string[] = []
      const seen = new Set<string>()
      for (const raw of current) {
        if (typeof raw !== 'string') continue
        const replaced = srcSet.has(norm(raw)) ? dst : raw
        const key = norm(replaced)
        if (seen.has(key)) continue
        seen.add(key)
        next.push(replaced)
      }
      return supabase.from('leads').update({ tags: next }).eq('id', row.id)
    })

    const results = await Promise.all(updates)
    const failed = results.find((r) => r.error)
    if (failed?.error) throw failed.error
    await refresh()
  }

  return {
    stats,
    pending,
    refresh,
    renameTag,
    deleteTag,
    mergeTags,
  }
}
