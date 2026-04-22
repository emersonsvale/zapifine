import type { Database } from '~~/types/database'

type Config = Database['public']['Tables']['lembretes_config']['Row']
type ConfigInsert = Database['public']['Tables']['lembretes_config']['Insert']
type ConfigUpdate = Database['public']['Tables']['lembretes_config']['Update']

type Template = Database['public']['Tables']['lembretes_templates']['Row']
type TemplateInsert = Database['public']['Tables']['lembretes_templates']['Insert']
type TemplateUpdate = Database['public']['Tables']['lembretes_templates']['Update']

export type LembreteTipo = Database['public']['Enums']['enum_tipo_lembretes']

export function useLembretes() {
  const supabase = useSupabaseClient<Database>()
  const { data: current } = useCurrentUser()

  const companyId = computed(() => current.value?.companie_id ?? null)

  const {
    data: config,
    pending: configPending,
    refresh: refreshConfig,
  } = useAsyncData<Config | null>(
    'lembretes-config',
    async () => {
      if (!companyId.value) return null
      const { data, error } = await supabase
        .from('lembretes_config')
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

  const {
    data: templates,
    pending: templatesPending,
    refresh: refreshTemplates,
  } = useAsyncData<Template[]>(
    'lembretes-templates',
    async () => {
      if (!companyId.value) return []
      const { data, error } = await supabase
        .from('lembretes_templates')
        .select('*')
        .eq('companies_id', companyId.value)
        .order('id', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    { watch: [companyId], default: () => [] },
  )

  async function upsertConfig(patch: {
    ativo: boolean
    envio_whatsapp: boolean
    envio_email: boolean
    primeiro_lote_tempo: string | null
    primeiro_lote_tipo: string | null
    segundo_lote_tempo: string | null
    segundo_lote_tipo: string | null
    cancelamento: boolean
  }): Promise<Config> {
    if (!companyId.value) throw new Error('Empresa não carregada.')

    if (config.value?.id) {
      const update: ConfigUpdate = { ...patch }
      const { data, error } = await supabase
        .from('lembretes_config')
        .update(update)
        .eq('id', config.value.id)
        .select('*')
        .maybeSingle()
      if (error) throw error
      if (data) config.value = data
      return data!
    }

    const insert: ConfigInsert = { ...patch, companies_id: companyId.value }
    const { data, error } = await supabase
      .from('lembretes_config')
      .insert(insert)
      .select('*')
      .maybeSingle()
    if (error) throw error
    if (data) config.value = data
    return data!
  }

  async function createTemplate(input: {
    titulo: string
    mensagem: string
    tipo_lembrete: LembreteTipo
  }) {
    if (!companyId.value) throw new Error('Empresa não carregada.')
    const insert: TemplateInsert = {
      companies_id: companyId.value,
      titulo: input.titulo.trim(),
      mensagem: input.mensagem.trim(),
      tipo_lembrete: input.tipo_lembrete,
      ativo: false,
      lembretes_config_id: config.value?.id ?? null,
    }
    const { error } = await supabase.from('lembretes_templates').insert(insert)
    if (error) throw error
    await refreshTemplates()
  }

  async function updateTemplate(id: number, patch: TemplateUpdate) {
    const row = templates.value?.find((t) => t.id === id)
    const prev = row ? { ...row } : null
    if (row) Object.assign(row, patch)
    const { error } = await supabase
      .from('lembretes_templates')
      .update(patch)
      .eq('id', id)
    if (error) {
      if (row && prev) Object.assign(row, prev)
      throw error
    }
  }

  async function deleteTemplate(id: number) {
    const { error } = await supabase
      .from('lembretes_templates')
      .delete()
      .eq('id', id)
    if (error) throw error
    await refreshTemplates()
  }

  return {
    config,
    configPending,
    templates,
    templatesPending,
    refreshConfig,
    refreshTemplates,
    upsertConfig,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    companyId,
  }
}
