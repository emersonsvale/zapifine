import type { Database } from '~~/types/database'

export type DashboardStats = {
  totalMensagens: number
  mensagensEstaSemana: number
  mensagensSemanaPassada: number
  totalLeads: number
  leadsUltimaSemana: number
  tempoMedioRespostaSeg: number | null
  taxaConversao: number
  statusDesempenho: {
    taxa_resposta: number
    precisao_respostas: number
    satisfacao_cliente: number
    taxa_conclusao: number
  }
  graficoMensagens: { labels: string[]; valores: number[] }
  graficoConversao: { labels: string[]; valores: number[] }
}

export type DashboardActivity = {
  id: number | string
  name: string
  description: string
  time: string
}

type DashboardEdgeResponse = {
  total_mensagens?: number
  taxa_conversao?: number
  tempo_medio_resposta?: string
  leads_gerados?: number
  status_desempenho?: {
    taxa_resposta?: number
    precisao_respostas?: number
    satisfacao_cliente?: number
    taxa_conclusao?: number
  }
  percentuais_mensagens?: { semana_atual?: number; semana_passada?: number }
  ultimas_atividades?: Array<{ nome_lead: string; resumo: string; hora: string }>
  grafico_mensagens?: { labels: string[]; valores: number[] }
  grafico_conversao?: { labels: string[]; valores: number[] }
}

function parseSegFromTempo(tempo: string | undefined): number | null {
  if (!tempo) return null
  const m = /(\d+)\s*s/i.exec(tempo)
  if (!m) return null
  return Number.parseInt(m[1] ?? '0', 10) || 0
}

export function useDashboardData() {
  const supabase = useSupabaseClient<Database>()
  const authUser = useSupabaseUser()
  const { data: current } = useCurrentUser()

  const companyId = computed(() => current.value?.companie_id ?? null)

  const stats = useAsyncData<DashboardStats | null>(
    'dashboard-stats',
    async () => {
      if (!companyId.value) return null
      const { data, error } = await supabase.functions.invoke<DashboardEdgeResponse>(
        'dashboard',
        {
          method: 'POST',
          body: { companies_id: companyId.value },
        },
      )
      if (error) throw error
      const d = data ?? {}
      const tempo = parseSegFromTempo(d.tempo_medio_resposta)
      return {
        totalMensagens: d.total_mensagens ?? 0,
        mensagensEstaSemana: d.percentuais_mensagens?.semana_atual ?? 0,
        mensagensSemanaPassada: d.percentuais_mensagens?.semana_passada ?? 0,
        totalLeads: 0,
        leadsUltimaSemana: d.leads_gerados ?? 0,
        tempoMedioRespostaSeg: tempo,
        taxaConversao: d.taxa_conversao ?? 0,
        statusDesempenho: {
          taxa_resposta: d.status_desempenho?.taxa_resposta ?? 0,
          precisao_respostas: d.status_desempenho?.precisao_respostas ?? 0,
          satisfacao_cliente: d.status_desempenho?.satisfacao_cliente ?? 0,
          taxa_conclusao: d.status_desempenho?.taxa_conclusao ?? 0,
        },
        graficoMensagens: d.grafico_mensagens ?? { labels: [], valores: [] },
        graficoConversao: d.grafico_conversao ?? { labels: [], valores: [] },
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

function formatTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
