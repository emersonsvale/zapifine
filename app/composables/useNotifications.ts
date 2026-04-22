import type { Database } from '~~/types/database'

type Notification = Database['public']['Tables']['notifications']['Row']

export function useNotifications() {
  const supabase = useSupabaseClient<Database>()
  const authUser = useSupabaseUser()
  const { data: currentUser } = useCurrentUser()

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

  return { notifications, refresh, pending, unreadCount, markAsRead, markAllAsRead }
}
