import type { Database } from '~~/types/database'

export type LeadKanbanStats = {
  lead_id: number
  unread: number
  last_msg_at: string | null
}

export function useKanbanStats() {
  const supabase = useSupabaseClient<Database>()
  const activeFunilId = useState<number | null>('active-funil-id', () => null)

  const {
    data: stats,
    refresh: refreshStats,
    pending: statsPending,
  } = useAsyncData<LeadKanbanStats[]>(
    'lead-kanban-stats',
    async () => {
      const funilId = activeFunilId.value
      if (funilId == null) return []
      const { data, error } = await supabase.rpc(
        'lead_kanban_stats' as never,
        { p_funil_id: funilId } as never,
      )
      if (error) throw error
      return (data as unknown as LeadKanbanStats[]) ?? []
    },
    { watch: [activeFunilId], default: () => [] },
  )

  const byLead = computed(() => {
    const map = new Map<number, LeadKanbanStats>()
    for (const s of stats.value ?? []) map.set(s.lead_id, s)
    return map
  })

  function statsFor(leadId: number): LeadKanbanStats | null {
    return byLead.value.get(leadId) ?? null
  }

  function unreadFor(leadId: number): number {
    return byLead.value.get(leadId)?.unread ?? 0
  }

  return {
    stats,
    statsPending,
    refreshStats,
    byLead,
    statsFor,
    unreadFor,
  }
}
