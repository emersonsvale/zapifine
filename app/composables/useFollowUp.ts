import type { Database } from '~~/types/database'

type FollowUpConfig = Database['public']['Tables']['follow_up_config']['Row']
type FollowUpInsert = Database['public']['Tables']['follow_up_config']['Insert']
type FollowUpUpdate = Database['public']['Tables']['follow_up_config']['Update']

export function useFollowUp() {
  const supabase = useSupabaseClient<Database>()
  const { data: current } = useCurrentUser()

  const companyId = computed(() => current.value?.companie_id ?? null)

  const { data: config, refresh, pending } = useAsyncData<FollowUpConfig | null>(
    'follow-up-config',
    async () => {
      if (!companyId.value) return null
      const { data, error } = await supabase
        .from('follow_up_config')
        .select('*')
        .eq('companies_id', companyId.value)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data ?? null
    },
    { watch: [companyId] },
  )

  async function upsertConfig(patch: {
    ativado: boolean
    primeira_chamada: number
    intervalo_chamadas: number
    maximo_chamadas: number
    mensagem: string
    acao: string | null
  }) {
    if (!companyId.value) throw new Error('Empresa não carregada.')

    if (config.value?.id) {
      const update: FollowUpUpdate = { ...patch }
      const { data, error } = await supabase
        .from('follow_up_config')
        .update(update)
        .eq('id', config.value.id)
        .select('*')
        .maybeSingle()
      if (error) throw error
      config.value = data
      return
    }

    const insert: FollowUpInsert = {
      ...patch,
      companies_id: companyId.value,
    }
    const { data, error } = await supabase
      .from('follow_up_config')
      .insert(insert)
      .select('*')
      .maybeSingle()
    if (error) throw error
    config.value = data
  }

  return { config, pending, refresh, upsertConfig, companyId }
}
