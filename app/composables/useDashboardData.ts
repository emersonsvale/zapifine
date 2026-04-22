import type { Database } from '~~/types/database'

type LeadRow = Database['public']['Tables']['leads']['Row']

export type DashboardStats = {
  totalMensagens: number
  mensagensEstaSemana: number
  mensagensSemanaPassada: number
  totalLeads: number
  leadsUltimaSemana: number
  tempoMedioRespostaSeg: number | null
  taxaConversao: number
}

export type DashboardActivity = {
  id: number
  name: string
  description: string
  time: string
}

function startOfWeekUTC(ref = new Date()) {
  const d = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()),
  )
  const day = d.getUTCDay()
  const diff = (day + 6) % 7
  d.setUTCDate(d.getUTCDate() - diff)
  return d
}

function formatTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

async function count(
  supabase: ReturnType<typeof useSupabaseClient<Database>>,
  table: 'whats_mensagens_conversa' | 'leads',
  companyId: string,
  range?: { gte?: string; lt?: string },
  companyColumnOverride?: string,
) {
  let q = supabase.from(table).select('id', { count: 'exact', head: true })

  if (table === 'leads') {
    q = q.eq('companies_id', companyId)
  } else {
    const col = companyColumnOverride ?? 'companies_id'
    q = q.eq(
      col as 'companies_id' | 'lead_id',
      companyId as unknown as never,
    )
  }

  if (range?.gte) q = q.gte('created_at', range.gte)
  if (range?.lt) q = q.lt('created_at', range.lt)

  const { count: c, error } = await q
  if (error) throw error
  return c ?? 0
}

export function useDashboardData() {
  const supabase = useSupabaseClient<Database>()
  const authUser = useSupabaseUser()
  const { data: current } = useCurrentUser()

  const companyId = computed(
    () => current.value?.companie_id ?? null,
  )

  const stats = useAsyncData<DashboardStats | null>(
    'dashboard-stats',
    async () => {
      if (!companyId.value) return null

      const thisWeek = startOfWeekUTC()
      const lastWeek = new Date(thisWeek)
      lastWeek.setUTCDate(lastWeek.getUTCDate() - 7)

      const leadIds = await supabase
        .from('leads')
        .select('id')
        .eq('companies_id', companyId.value)
      if (leadIds.error) throw leadIds.error
      const ids = (leadIds.data ?? []).map((r) => r.id)

      const totalMsgsQ = ids.length
        ? supabase
            .from('whats_mensagens_conversa')
            .select('id', { count: 'exact', head: true })
            .in('lead_id', ids)
        : Promise.resolve({ count: 0, error: null } as const)

      const thisWeekMsgsQ = ids.length
        ? supabase
            .from('whats_mensagens_conversa')
            .select('id', { count: 'exact', head: true })
            .in('lead_id', ids)
            .gte('created_at', thisWeek.toISOString())
        : Promise.resolve({ count: 0, error: null } as const)

      const lastWeekMsgsQ = ids.length
        ? supabase
            .from('whats_mensagens_conversa')
            .select('id', { count: 'exact', head: true })
            .in('lead_id', ids)
            .gte('created_at', lastWeek.toISOString())
            .lt('created_at', thisWeek.toISOString())
        : Promise.resolve({ count: 0, error: null } as const)

      const totalLeadsQ = count(supabase, 'leads', companyId.value)
      const leadsLastWeekQ = count(supabase, 'leads', companyId.value, {
        gte: lastWeek.toISOString(),
      })

      const [totalMsgs, thisWeekMsgs, lastWeekMsgs, totalLeads, leadsLastWeek] =
        await Promise.all([
          totalMsgsQ,
          thisWeekMsgsQ,
          lastWeekMsgsQ,
          totalLeadsQ,
          leadsLastWeekQ,
        ])

      const totalMensagens =
        'count' in totalMsgs ? (totalMsgs.count ?? 0) : 0
      const mensagensEstaSemana =
        'count' in thisWeekMsgs ? (thisWeekMsgs.count ?? 0) : 0
      const mensagensSemanaPassada =
        'count' in lastWeekMsgs ? (lastWeekMsgs.count ?? 0) : 0

      return {
        totalMensagens,
        mensagensEstaSemana,
        mensagensSemanaPassada,
        totalLeads,
        leadsUltimaSemana: leadsLastWeek,
        tempoMedioRespostaSeg: null,
        taxaConversao: 0,
      }
    },
    { watch: [companyId] },
  )

  const activities = useAsyncData<DashboardActivity[]>(
    'dashboard-activities',
    async () => {
      if (!companyId.value) return []
      const { data, error } = await supabase
        .from('leads')
        .select('id,nome_lead,resumo_lead,ultima_interacao_lead,created_at')
        .eq('companies_id', companyId.value)
        .order('ultima_interacao_lead', {
          ascending: false,
          nullsFirst: false,
        })
        .limit(5)
      if (error) throw error
      return (data ?? []).map<DashboardActivity>((l) => ({
        id: l.id,
        name: l.nome_lead?.trim() || 'Sem nome',
        description: l.resumo_lead?.trim() || 'NA',
        time: formatTime(l.ultima_interacao_lead ?? l.created_at),
      }))
    },
    { watch: [companyId] },
  )

  return { stats, activities, authUser, companyId }
}
