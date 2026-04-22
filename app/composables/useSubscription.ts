import type { Database } from '~~/types/database'

type Plan = Database['public']['Tables']['plan']['Row']
type PlanAssinado = Database['public']['Tables']['plan_assinados']['Row']
type Uso = Database['public']['Tables']['plan_uso_mensal']['Row']
type Cobranca = Database['public']['Tables']['cobrancas']['Row']

export type CurrentSubscription = PlanAssinado & { plan: Plan | null }

function firstOfMonthISO(ref = new Date()) {
  return new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10)
}

function addMonths(iso: string | null | undefined, n: number): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString()
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

export function useSubscription() {
  const supabase = useSupabaseClient<Database>()
  const { data: current } = useCurrentUser()

  const companyId = computed(() => current.value?.companie_id ?? null)
  const userId = computed(() => current.value?.id ?? null)

  const subscription = useAsyncData<CurrentSubscription | null>(
    () => `subscription-current:${companyId.value ?? 'none'}`,
    async () => {
      if (!companyId.value) return null
      // Pega a mais recente da empresa, priorizando ativas.
      const { data, error } = await supabase
        .from('plan_assinados')
        .select('*, plan:plan_id(*)')
        .eq('companie_id', companyId.value)
        .order('ativo', { ascending: false })
        .order('data_inicio', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) {
        console.error('[useSubscription] plan_assinados', error)
        throw error
      }
      return (data as CurrentSubscription) ?? null
    },
    { watch: [companyId] },
  )

  const usoAtual = useAsyncData<Uso | null>(
    () => `subscription-uso-atual:${companyId.value ?? 'none'}`,
    async () => {
      if (!companyId.value) return null
      const mes = firstOfMonthISO()
      const { data, error } = await supabase
        .from('plan_uso_mensal')
        .select('*')
        .eq('companie_id', companyId.value)
        .eq('mes', mes)
        .maybeSingle()
      if (error) {
        console.error('[useSubscription] uso-atual', error)
        throw error
      }
      return data ?? null
    },
    { watch: [companyId] },
  )

  const usoHistorico = useAsyncData<Uso[]>(
    () => `subscription-uso-historico:${companyId.value ?? 'none'}`,
    async () => {
      if (!companyId.value) return []
      const { data, error } = await supabase
        .from('plan_uso_mensal')
        .select('*')
        .eq('companie_id', companyId.value)
        .order('mes', { ascending: false })
        .limit(12)
      if (error) {
        console.error('[useSubscription] uso-historico', error)
        throw error
      }
      return data ?? []
    },
    { watch: [companyId], default: () => [] },
  )

  const faturas = useAsyncData<Cobranca[]>(
    () => `subscription-faturas:${companyId.value ?? 'none'}`,
    async () => {
      if (!companyId.value) return []
      const { data, error } = await supabase
        .from('cobrancas')
        .select('*')
        .eq('companie_id', companyId.value)
        .order('vencimento', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false })
        .limit(24)
      if (error) {
        console.error('[useSubscription] cobrancas', error)
        throw error
      }
      return data ?? []
    },
    { watch: [companyId], default: () => [] },
  )

  const planos = useAsyncData<Plan[]>(
    'subscription-planos',
    async () => {
      const { data, error } = await supabase
        .from('plan')
        .select('*')
        .order('valor_mensal', { ascending: true, nullsFirst: true })
      if (error) throw error
      return data ?? []
    },
  )

  const proximaCobranca = computed(() => {
    const s = subscription.data.value
    if (!s?.data_inicio) return null
    return addMonths(s.data_inicio, 1)
  })

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

  async function openCustomerPortal(): Promise<string> {
    if (!companyId.value) throw new Error('Empresa não carregada.')
    const res = await invoke<{ portal_url: string }>('stripe_alterar_forma_pgto', {
      companie_id: companyId.value,
    })
    if (!res?.portal_url) throw new Error('URL do portal não recebida.')
    return res.portal_url
  }

  async function cancelSubscription(opts?: { imediato?: boolean }) {
    if (!companyId.value) throw new Error('Empresa não carregada.')
    const planAssinadoId = subscription.data.value?.id
    const slug = opts?.imediato
      ? 'stripe_cancelar_plano_imediatamente'
      : 'stripe_cancel_plan'
    const payload: Record<string, unknown> = { companie_id: companyId.value }
    if (!opts?.imediato && planAssinadoId) {
      payload.plan_assinado_id = planAssinadoId
    }
    await invoke<unknown>(slug, payload)
    await subscription.refresh()
  }

  async function checkout(planId: number): Promise<string> {
    if (!userId.value) throw new Error('Usuário não autenticado.')
    const res = await invoke<{ url: string }>('stripe_checkout', {
      user_id: userId.value,
      plan_id: planId,
    })
    if (!res?.url) throw new Error('URL de checkout não recebida.')
    return res.url
  }

  async function changePlan(newPlanId: number) {
    if (!companyId.value) throw new Error('Empresa não carregada.')
    await invoke<unknown>('stripe_mudar_plano', {
      companie_id: companyId.value,
      new_plan_id: newPlanId,
    })
    await Promise.all([subscription.refresh(), faturas.refresh()])
  }

  async function payTrialNow(opts?: { restartCycle?: boolean }) {
    if (!companyId.value) throw new Error('Empresa não carregada.')
    await invoke<unknown>('stripe_pagar_trial_agora', {
      companie_id: companyId.value,
      restart_cycle: !!opts?.restartCycle,
    })
    await Promise.all([subscription.refresh(), faturas.refresh()])
  }

  return {
    subscription,
    usoAtual,
    usoHistorico,
    faturas,
    planos,
    proximaCobranca,
    companyId,
    userId,
    openCustomerPortal,
    cancelSubscription,
    checkout,
    changePlan,
    payTrialNow,
  }
}
