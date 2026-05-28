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

export type RecentMessage = {
  id: number
  conversaId: number
  name: string
  snippet: string
  time: string
  inbound: boolean
  isGroup: boolean
}

type DashboardRpcResponse = {
  total_mensagens?: number
  taxa_conversao?: number
  tempo_medio_resposta?: string
  tempo_medio_resposta_seg?: number
  leads_gerados?: number
  status_desempenho?: {
    taxa_resposta?: number
    precisao_respostas?: number
    satisfacao_cliente?: number
    taxa_conclusao?: number
  }
  percentuais_mensagens?: { semana_atual?: number; semana_passada?: number }
  grafico_mensagens?: { labels: string[]; valores: number[] }
  grafico_conversao?: { labels: string[]; valores: number[] }
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
      const { data, error } = await supabase.rpc('dashboard_stats' as never, {
        p_company_id: companyId.value,
      } as never)
      if (error) throw error
      const d = (data ?? {}) as DashboardRpcResponse
      return {
        totalMensagens: d.total_mensagens ?? 0,
        mensagensEstaSemana: d.percentuais_mensagens?.semana_atual ?? 0,
        mensagensSemanaPassada: d.percentuais_mensagens?.semana_passada ?? 0,
        totalLeads: 0,
        leadsUltimaSemana: d.leads_gerados ?? 0,
        tempoMedioRespostaSeg: d.tempo_medio_resposta_seg ?? null,
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

  const recentMessages = useAsyncData<RecentMessage[]>(
    'dashboard-recent-messages',
    async () => {
      if (!companyId.value) return []
      const { data, error } = await supabase
        .from('whats_mensagens_conversa')
        .select(
          'id, created_at, mensagem, tipo, status, whats_conversa_id, whats_conversa!inner(id, isgrupo, "grupoNome", "remoteJid", companies_id, leads(nome_lead, numero_whatsapp_lead))' as never,
        )
        .eq('whats_conversa.companies_id' as never, companyId.value)
        .eq('interna' as never, false)
        .neq('tipo' as never, 'evento')
        .neq('deletada' as never, true)
        .order('created_at', { ascending: false })
        .limit(8)
      if (error) throw error
      return (data ?? []).map((r: any): RecentMessage => {
        const conv = r.whats_conversa
        const lead = conv?.leads
        const isGroup = !!conv?.isgrupo
        const name = isGroup
          ? conv?.grupoNome?.trim() || 'Grupo'
          : lead?.nome_lead?.trim() ||
            lead?.numero_whatsapp_lead ||
            conv?.remoteJid ||
            'Sem nome'
        const tipo = (r.tipo ?? '').toLowerCase()
        const inbound = r.status === 'Recebida'
        const raw = (r.mensagem ?? '').replace(/[*_~`]/g, '').trim()
        let snippet = raw
        if (!raw) {
          if (['image', 'imagem', 'photo', 'picture', 'imagemessage'].includes(tipo)) snippet = '📷 Imagem'
          else if (['audio', 'voice', 'ptt', 'audiomessage'].includes(tipo)) snippet = '🎤 Áudio'
          else if (['video', 'videomessage'].includes(tipo)) snippet = '🎬 Vídeo'
          else if (['document', 'file', 'pdf', 'documentmessage'].includes(tipo)) snippet = '📎 Documento'
          else snippet = '—'
        }
        const prefix = inbound ? '' : 'Você: '
        return {
          id: r.id,
          conversaId: r.whats_conversa_id,
          name,
          snippet: prefix + snippet.slice(0, 140),
          time: formatTime(r.created_at),
          inbound,
          isGroup,
        }
      })
    },
    { watch: [companyId] },
  )

  return { stats, recentMessages, authUser, companyId }
}

function formatTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
