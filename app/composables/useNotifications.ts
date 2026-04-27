import type { Database } from '~~/types/database'

type Notification = Database['public']['Tables']['notifications']['Row']

export function useNotifications() {
  const supabase = useSupabaseClient<Database>()
  const authUser = useSupabaseUser()
  const { data: currentUser } = useCurrentUser()
  const { toast } = useAlerts()
  const router = useRouter()

  const companyId = computed(() => currentUser.value?.companie_id ?? null)

  const { data: notifications, refresh, pending } = useAsyncData<Notification[]>(
    'notifications',
    async () => {
      if (!authUser.value?.id) return []
      const uid = authUser.value.id
      const cid = companyId.value

      const orFilter = cid
        ? `user_id.eq.${uid},and(user_id.is.null,company_id.eq.${cid})`
        : `user_id.eq.${uid}`

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(orFilter)
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return data ?? []
    },
    { watch: [authUser, companyId], default: () => [] },
  )

  const unreadCount = computed(
    () => notifications.value?.filter((n) => !n.read).length ?? 0,
  )

  async function markAsRead(id: string) {
    const prev = notifications.value ?? []
    notifications.value = prev.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    )
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
    if (error) {
      notifications.value = prev
      throw error
    }
  }

  async function markAllAsRead() {
    const prev = notifications.value ?? []
    const ids = prev.filter((n) => !n.read).map((n) => n.id)
    if (!ids.length) return
    notifications.value = prev.map((n) =>
      n.read ? n : { ...n, read: true },
    )
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', ids)
    if (error) {
      notifications.value = prev
      throw error
    }
  }

  function openNotificationTarget(n: Notification) {
    const refType = (n.reference_type || '').toLowerCase()
    const refId = n.reference_id
    const tipo = (n.tipo || '').toLowerCase()

    // 1) Roteamento por reference_type + reference_id (mais especifico)
    if (refType === 'whats_conversa' && refId) {
      router.push({ path: '/multiatendimento/chats', query: { conv: refId } })
      return true
    }
    if (refType === 'agendamento') {
      router.push({ path: '/agendas', ...(refId ? { query: { ag: refId } } : {}) })
      return true
    }
    if (refType === 'lead' && refId) {
      router.push(`/crm/leads/${refId}`)
      return true
    }

    // 2) Legacy: reference_type no formato "conversa:<id>"
    if (refType.startsWith('conversa:')) {
      const convId = refType.split(':')[1]
      if (convId) {
        router.push({ path: '/multiatendimento/chats', query: { conv: convId } })
        return true
      }
    }

    // 3) Fallback por tipo
    switch (tipo) {
      case 'mensagem':
      case 'transferencia':
        router.push('/multiatendimento/chats')
        return true
      case 'agenda':
        router.push('/agendas')
        return true
      case 'lead':
        router.push('/crm/funis')
        return true
      case 'pagamento':
        router.push('/assinatura')
        return true
      default:
        return false
    }
  }

  // Realtime: insert + update
  let channel: ReturnType<typeof supabase.channel> | null = null

  if (import.meta.client) {
    watch(
      [authUser, companyId],
      async ([u, cid]) => {
        if (channel) {
          await supabase.removeChannel(channel)
          channel = null
        }
        if (!u?.id) return
        const uid = u.id
        channel = supabase
          .channel(`notif-${uid}-${Math.random().toString(36).slice(2, 8)}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${uid}`,
            },
            (payload) => {
              const row = payload.new as Notification
              const list = notifications.value ?? []
              if (list.find((n) => n.id === row.id)) return
              notifications.value = [row, ...list].slice(0, 30)
              const tipo = (row as unknown as { tipo?: string | null }).tipo
              if (tipo === 'transferencia') {
                toast.info(row.title || 'Conversa transferida pra você.', {
                  description: row.message ?? undefined,
                })
              } else if (row.title) {
                toast.info(row.title, { description: row.message ?? undefined })
              }
            },
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${uid}`,
            },
            (payload) => {
              const row = payload.new as Notification
              const list = notifications.value ?? []
              const idx = list.findIndex((n) => n.id === row.id)
              if (idx === -1) return
              const next = list.slice()
              next[idx] = row
              notifications.value = next
            },
          )
          .subscribe()
      },
      { immediate: true },
    )

    onBeforeUnmount(async () => {
      if (channel) await supabase.removeChannel(channel)
    })
  }

  return {
    notifications,
    refresh,
    pending,
    unreadCount,
    markAsRead,
    markAllAsRead,
    openNotificationTarget,
  }
}
