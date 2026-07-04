import type { Database } from '~~/types/database'

type Agendamento = Database['public']['Tables']['agendamentos']['Row']
type Lead = Database['public']['Tables']['leads']['Row']

export type AgendamentoWithLead = Agendamento & { lead: Lead | null }

export type AttendeeInput = {
  email: string
  display_name?: string | null
  lead_id?: number | null
}

export type NovoAgendamentoInput = {
  title: string
  start: string // ISO 8601 com timezone
  end: string   // ISO 8601 com timezone
  timezone?: string
  description?: string | null
  location?: string | null
  with_meet?: boolean
  attendees?: AttendeeInput[]
  lead_id?: number | null
  user_id?: string | null
  force_outside_availability?: boolean
  send_updates?: 'all' | 'externalOnly' | 'none'
}

export type CreateEventError = Error & {
  code?: string
  reason?: string | null
}

function asCreateError(err: unknown): CreateEventError {
  const e = err as {
    statusCode?: number
    statusMessage?: string
    data?: { statusMessage?: string; message?: string; code?: string; reason?: string }
    message?: string
  }
  const message =
    e?.data?.statusMessage
    ?? e?.statusMessage
    ?? e?.data?.message
    ?? e?.message
    ?? 'Erro desconhecido'
  const out = new Error(message) as CreateEventError
  out.code = e?.data?.code
  out.reason = e?.data?.reason ?? null
  return out
}

export type EditarAgendamentoInput = Partial<NovoAgendamentoInput>

function asMessage(err: unknown): string {
  const e = err as {
    statusMessage?: string
    data?: { statusMessage?: string; message?: string }
    message?: string
  }
  return (
    e?.data?.statusMessage
    ?? e?.statusMessage
    ?? e?.data?.message
    ?? e?.message
    ?? 'Erro desconhecido'
  )
}

export function useAgendamentos() {
  const supabase = useSupabaseClient<Database>()
  const { data: current } = useCurrentUser()

  const companyId = computed(() => current.value?.companie_id ?? null)
  const userId = computed(() => current.value?.id ?? null)

  const { data: myIntegrations, refresh: refreshIntegrations } = useAsyncData(
    'my-google-integrations',
    async () => {
      if (!userId.value) return [] as Array<{ id: string }>
      const { data, error } = await supabase
        .from('google_integrations')
        .select('id')
        .eq('user_id', userId.value)
        .is('revoked_at', null)
      if (error) return []
      return (data ?? []) as Array<{ id: string }>
    },
    { watch: [userId], default: () => [] },
  )

  const isGoogleConnected = computed(() => (myIntegrations.value?.length ?? 0) > 0)

  const googleConnectUrl = computed(() => {
    if (!userId.value) return null
    return '/api/google/oauth/start'
  })

  async function disconnectGoogle() {
    try {
      await $fetch('/api/google/oauth/disconnect', { method: 'POST' })
      await refreshIntegrations()
    } catch (err) {
      throw new Error(asMessage(err))
    }
  }

  const isOwner = computed(() => current.value?.funcao_user === 'OWNER')

  const { data, refresh, pending } = useAsyncData<AgendamentoWithLead[]>(
    'agendamentos',
    async () => {
      if (!companyId.value) return []
      let q = supabase
        .from('agendamentos')
        .select('*, lead:lead_id(*)')
        .eq('companie_id', companyId.value)
      if (!isOwner.value && userId.value) {
        q = q.eq('user_id', userId.value)
      }
      const { data, error } = await q
        .order('gg_start', { ascending: true, nullsFirst: false })
      if (error) throw error
      return (data as AgendamentoWithLead[]) ?? []
    },
    { watch: [companyId, userId, isOwner], default: () => [] },
  )

  async function createEvent(input: NovoAgendamentoInput) {
    try {
      const res = await $fetch<{ ok: true; id: string; link: string | null; meetLink: string | null }>(
        '/api/agendamentos',
        { method: 'POST', body: input },
      )
      await refresh()
      return res
    } catch (err) {
      throw asCreateError(err)
    }
  }

  async function updateEvent(id: string, input: EditarAgendamentoInput) {
    try {
      const res = await $fetch<{ ok: true; id: string }>(
        `/api/agendamentos/${encodeURIComponent(id)}`,
        { method: 'PATCH', body: input },
      )
      await refresh()
      return res
    } catch (err) {
      throw new Error(asMessage(err))
    }
  }

  async function confirmEvent(agendamentoId: string) {
    try {
      const res = await $fetch<{ ok: true; id: string; lembretes_enqueued: number }>(
        `/api/agendamentos/${encodeURIComponent(agendamentoId)}/confirm`,
        { method: 'POST' },
      )
      await refresh()
      return res
    } catch (err) {
      throw new Error(asMessage(err))
    }
  }

  async function cancelEvent(agendamentoId: string) {
    try {
      const res = await $fetch<{ ok: true; id: string }>(
        `/api/agendamentos/${encodeURIComponent(agendamentoId)}`,
        { method: 'DELETE' },
      )
      await refresh()
      return res
    } catch (err) {
      throw new Error(asMessage(err))
    }
  }

  async function syncFromGoogle() {
    try {
      const res = await $fetch<{
        fetched: number
        upserted: number
        cancelled: number
        full_resync: boolean
        next_sync_token: string | null
      }>('/api/google/sync', { method: 'POST' })
      await refresh()
      return res
    } catch (err) {
      throw new Error(asMessage(err))
    }
  }

  return {
    agendamentos: data,
    refresh,
    pending,
    companyId,
    userId,
    isGoogleConnected,
    googleConnectUrl,
    disconnectGoogle,
    createEvent,
    updateEvent,
    confirmEvent,
    cancelEvent,
    syncFromGoogle,
  }
}
