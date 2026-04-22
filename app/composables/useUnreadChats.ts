import type { Database } from '~~/types/database'

export function useUnreadChats() {
  const supabase = useSupabaseClient<Database>()
  const { data: currentUser } = useCurrentUser()

  const companyId = computed(() => currentUser.value?.companie_id ?? null)

  const unreadCount = useState<number>('chats-unread-count', () => 0)

  async function fetchCount() {
    if (!companyId.value) {
      unreadCount.value = 0
      return
    }
    const { data: convs, error: convErr } = await supabase
      .from('whats_conversa')
      .select('id')
      .eq('companies_id', companyId.value)
    if (convErr) {
      console.error('[useUnreadChats] conversas', convErr)
      return
    }
    const ids = (convs ?? []).map((c) => c.id)
    if (!ids.length) {
      unreadCount.value = 0
      return
    }
    const { count, error } = await supabase
      .from('whats_mensagens_conversa')
      .select('id', { count: 'exact', head: true })
      .in('whats_conversa_id', ids)
      .eq('status', 'Recebida')
      .eq('visto' as never, false as never)
    if (error) {
      console.error('[useUnreadChats] count', error)
      return
    }
    unreadCount.value = count ?? 0
  }

  watch(companyId, () => fetchCount(), { immediate: true })

  let channel: ReturnType<typeof supabase.channel> | null = null
  if (import.meta.client) {
    watch(
      companyId,
      async (cid) => {
        if (channel) {
          await supabase.removeChannel(channel)
          channel = null
        }
        if (!cid) return
        channel = supabase
          .channel(`unread-company-${cid}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'whats_mensagens_conversa',
            },
            () => fetchCount(),
          )
          .subscribe()
      },
      { immediate: true },
    )

    onBeforeUnmount(async () => {
      if (channel) await supabase.removeChannel(channel)
    })
  }

  return { unreadCount, refresh: fetchCount }
}
