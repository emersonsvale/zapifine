import type { Database } from '~~/types/database'

type Agendamento = Database['public']['Tables']['agendamentos']['Row']
type Lead = Database['public']['Tables']['leads']['Row']
type StatusAgenda = Database['public']['Enums']['enum_status_agenda']

export type AgendamentoWithLead = Agendamento & { lead: Lead | null }

export type NovoAgendamentoInput = {
  title: string
  start: string
  end: string
  guest_email?: string | null
  lead_id?: number | null
}

async function fnError(err: unknown): Promise<string> {
  const e = err as { message?: string; context?: Response }
  let detail = e?.message ?? 'Erro desconhecido'
  try {
    if (e?.context && typeof e.context.text === 'function') {
      const body = await e.context.text()
      if (body) {
        try {
          const parsed = JSON.parse(body)
          detail = parsed.error ?? parsed.message ?? body
        } catch {
          detail = body
        }
      }
    }
  } catch {}
  return detail
}

export function useAgendamentos() {
  const supabase = useSupabaseClient<Database>()
  const { data: current } = useCurrentUser()
  const { company } = useCompany()

  const companyId = computed(() => current.value?.companie_id ?? null)
  const userId = computed(() => current.value?.id ?? null)

  const isGoogleConnected = computed(
    () => !!company.value?.gg_access_token,
  )

  const googleConnectUrl = computed(() => {
    if (!userId.value) return null
    return `https://n8n.valeapps.com.br/webhook/oauth-start?user_id=${userId.value}`
  })

  const { data, refresh, pending } = useAsyncData<AgendamentoWithLead[]>(
    'agendamentos',
    async () => {
      if (!companyId.value) return []
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*, lead:lead_id(*)')
        .eq('companie_id', companyId.value)
        .order('gg_start', { ascending: true, nullsFirst: false })
      if (error) throw error
      return (data as AgendamentoWithLead[]) ?? []
    },
    { watch: [companyId], default: () => [] },
  )

  async function invoke<T>(slug: string, body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke<T>(slug, {
      method: 'POST',
      body,
    })
    if (error) {
      const detail = await fnError(error)
      throw new Error(detail)
    }
    return data as T
  }

  async function createEvent(input: NovoAgendamentoInput) {
    if (!companyId.value) throw new Error('Empresa não carregada.')
    const res = await invoke<{ eventId: string; link?: string }>(
      'Create-Google-Event',
      {
        companie_id: companyId.value,
        title: input.title,
        start: input.start,
        end: input.end,
        guest_email: input.guest_email ?? null,
        lead_id: input.lead_id ?? null,
      },
    )
    await refresh()
    return res
  }

  async function createLembretes(agendamentoId: string) {
    return invoke<unknown>('create_lembretes_from_agendamento', {
      agendamentos_id: agendamentoId,
    })
  }

  async function confirmEvent(agendamentoId: string) {
    const { error } = await supabase
      .from('agendamentos')
      .update({ status_agenda: 'Confirmado' satisfies StatusAgenda })
      .eq('id', agendamentoId)
    if (error) throw error
    try {
      await createLembretes(agendamentoId)
    } catch (err) {
      console.warn('[agendamentos] lembretes:', err)
    }
    await refresh()
  }

  async function cancelEvent(agendamentoId: string) {
    if (!companyId.value) throw new Error('Empresa não carregada.')
    await invoke<unknown>('delete_google_event', {
      companie_id: companyId.value,
      event_id: agendamentoId,
    })
    await supabase
      .from('agendamentos')
      .update({ status_agenda: 'Cancelado' satisfies StatusAgenda })
      .eq('id', agendamentoId)
      .eq('companie_id', companyId.value)
    await refresh()
  }

  return {
    agendamentos: data,
    refresh,
    pending,
    companyId,
    userId,
    isGoogleConnected,
    googleConnectUrl,
    createEvent,
    confirmEvent,
    cancelEvent,
    createLembretes,
  }
}
