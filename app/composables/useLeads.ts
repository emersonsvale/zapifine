import type { Database } from '~~/types/database'

type LeadRow = Database['public']['Tables']['leads']['Row']
type ColumnRow = Database['public']['Tables']['ff_colunas_funil']['Row']

type CompanyContext = {
  companyId: string | null
  funilId: number | null
}

export function useLeads() {
  const supabase = useSupabaseClient<Database>()
  const authUser = useSupabaseUser()

  async function loadContext(): Promise<CompanyContext> {
    if (!authUser.value?.id) return { companyId: null, funilId: null }
    const { data, error } = await supabase
      .from('users')
      .select('companie_id, companies:companie_id(funil_incial_id)')
      .eq('id', authUser.value.id)
      .maybeSingle()
    if (error) return { companyId: null, funilId: null }
    const companyId = data?.companie_id ?? null
    const funilId =
      ((data?.companies as { funil_incial_id?: number | null } | null) ?? null)
        ?.funil_incial_id ?? null
    return { companyId, funilId }
  }

  const ctx = useState<CompanyContext>('leads-ctx', () => ({
    companyId: null,
    funilId: null,
  }))
  const activeFunilId = useState<number | null>('active-funil-id', () => null)
  const companyId = computed(() => ctx.value.companyId)
  const funilId = computed(() => activeFunilId.value ?? ctx.value.funilId)

  const {
    data: columns,
    refresh: refreshColumns,
    pending: columnsPending,
  } = useAsyncData<ColumnRow[]>(
    'lead-columns',
    async () => {
      const c = await loadContext()
      ctx.value = c
      if (activeFunilId.value == null && c.funilId != null) {
        activeFunilId.value = c.funilId
      }
      const target = activeFunilId.value ?? c.funilId
      if (!target) return []
      const { data, error } = await supabase
        .from('ff_colunas_funil')
        .select('*')
        .eq('funil_id', target)
        .order('id', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    { watch: [() => authUser.value?.id, activeFunilId], default: () => [] },
  )

  const {
    data: leads,
    refresh: refreshLeads,
    pending: leadsPending,
  } = useAsyncData<LeadRow[]>(
    'leads',
    async () => {
      const c = ctx.value.companyId ? ctx.value : await loadContext()
      if (!ctx.value.companyId && c.companyId) ctx.value = c
      if (!c.companyId) return []
      const target = activeFunilId.value ?? c.funilId
      let query = supabase
        .from('leads')
        .select('*')
        .eq('companies_id', c.companyId)
      if (target != null) query = query.eq('funil_id', target)
      const { data, error } = await query.order('ultima_interacao_lead', {
        ascending: false,
        nullsFirst: false,
      })
      if (error) throw error
      return data ?? []
    },
    { watch: [() => authUser.value?.id, activeFunilId], default: () => [] },
  )

  function leadsByColumn(colunaId: number) {
    return leads.value?.filter((l) => l.coluna_id === colunaId) ?? []
  }

  function countByColumn(colunaId: number) {
    return leadsByColumn(colunaId).length
  }

  async function moveLead(leadId: number, newColumnId: number) {
    const lead = leads.value?.find((l) => l.id === leadId)
    if (!lead) return
    const prev = lead.coluna_id
    if (prev === newColumnId) return
    lead.coluna_id = newColumnId
    const { data, error } = await supabase
      .from('leads')
      .update({ coluna_id: newColumnId })
      .eq('id', leadId)
      .select('id,coluna_id')
    if (error) {
      lead.coluna_id = prev
      throw error
    }
    if (!data || data.length === 0) {
      lead.coluna_id = prev
      throw new Error(
        `RLS bloqueou o UPDATE do lead ${leadId}. Verifique companies_id/policies.`,
      )
    }
  }

  async function createLead(input: {
    nome: string
    numero: string
    email?: string
    colunaId: number
    observacao?: string
  }): Promise<LeadRow> {
    const targetFunil = activeFunilId.value ?? ctx.value.funilId
    if (!ctx.value.companyId || !targetFunil) {
      throw new Error('Empresa ou funil não configurado.')
    }
    const { data, error } = await supabase
      .from('leads')
      .insert({
        nome_lead: input.nome.trim() || null,
        numero_whatsapp_lead: input.numero.trim() || null,
        'e-mail': input.email?.trim() || null,
        observacao: input.observacao?.trim() || null,
        coluna_id: input.colunaId,
        funil_id: targetFunil,
        companies_id: ctx.value.companyId,
        user_id: authUser.value?.id ?? null,
        ia_ativa: true,
      })
      .select('*')
      .single()
    if (error) throw error
    await refreshLeads()
    return data as LeadRow
  }

  async function deleteLead(leadId: number) {
    const { error } = await supabase.from('leads').delete().eq('id', leadId)
    if (error) throw error
    await refreshLeads()
  }

  type UpdateLeadInput = {
    nome_lead?: string | null
    numero_whatsapp_lead?: string | null
    email?: string | null
    cidade?: string | null
    estado?: string | null
    origem?: string | null
    prioridade?: string | null
    observacao?: string | null
    resumo_lead?: string | null
    coluna_id?: number | null
    tags?: string[] | null
    cpf?: string | null
    telefone_secundario?: string | null
    data_nascimento?: string | null
    genero?: string | null
    canal_preferido?: string | null
    empresa?: string | null
    cargo?: string | null
    cnpj?: string | null
    cep?: string | null
    rua?: string | null
    numero_endereco?: string | null
    complemento?: string | null
    bairro?: string | null
    valor_negocio?: number | null
    proxima_acao?: string | null
    proxima_acao_data?: string | null
  }

  async function updateLead(leadId: number, input: UpdateLeadInput) {
    const patch: Database['public']['Tables']['leads']['Update'] = {}
    if (input.nome_lead !== undefined) patch.nome_lead = input.nome_lead
    if (input.numero_whatsapp_lead !== undefined)
      patch.numero_whatsapp_lead = input.numero_whatsapp_lead
    if (input.email !== undefined) patch['e-mail'] = input.email
    if (input.cidade !== undefined) patch.cidade = input.cidade
    if (input.estado !== undefined) patch.estado = input.estado
    if (input.origem !== undefined) patch.origem = input.origem
    if (input.prioridade !== undefined) patch.prioridade = input.prioridade
    if (input.observacao !== undefined) patch.observacao = input.observacao
    if (input.resumo_lead !== undefined) patch.resumo_lead = input.resumo_lead
    if (input.coluna_id !== undefined) patch.coluna_id = input.coluna_id
    if (input.tags !== undefined) patch.tags = input.tags
    if (input.cpf !== undefined) patch.cpf = input.cpf
    if (input.telefone_secundario !== undefined) patch.telefone_secundario = input.telefone_secundario
    if (input.data_nascimento !== undefined) patch.data_nascimento = input.data_nascimento
    if (input.genero !== undefined) patch.genero = input.genero
    if (input.canal_preferido !== undefined) patch.canal_preferido = input.canal_preferido
    if (input.empresa !== undefined) patch.empresa = input.empresa
    if (input.cargo !== undefined) patch.cargo = input.cargo
    if (input.cnpj !== undefined) patch.cnpj = input.cnpj
    if (input.cep !== undefined) patch.cep = input.cep
    if (input.rua !== undefined) patch.rua = input.rua
    if (input.numero_endereco !== undefined) patch.numero_endereco = input.numero_endereco
    if (input.complemento !== undefined) patch.complemento = input.complemento
    if (input.bairro !== undefined) patch.bairro = input.bairro
    if (input.valor_negocio !== undefined) patch.valor_negocio = input.valor_negocio
    if (input.proxima_acao !== undefined) patch.proxima_acao = input.proxima_acao
    if (input.proxima_acao_data !== undefined) patch.proxima_acao_data = input.proxima_acao_data

    const { data, error } = await supabase
      .from('leads')
      .update(patch)
      .eq('id', leadId)
      .select('*')
      .single()
    if (error) throw error

    const list = leads.value ?? []
    const idx = list.findIndex((l) => l.id === leadId)
    if (idx !== -1 && data) {
      const next = list.slice()
      next[idx] = data as LeadRow
      leads.value = next
    }
    return data as LeadRow
  }

  async function toggleIa(leadId: number) {
    const lead = leads.value?.find((l) => l.id === leadId)
    if (!lead) return
    const next = !lead.ia_ativa
    lead.ia_ativa = next
    const { error } = await supabase
      .from('leads')
      .update({ ia_ativa: next })
      .eq('id', leadId)
    if (error) {
      lead.ia_ativa = !next
      throw error
    }
  }

  async function ensureLeadRemoteJid(leadId: number) {
    const lead = leads.value?.find((l) => l.id === leadId) ?? null
    let remoteJid: string | null = lead?.remoteJid_lead ?? null
    if (!remoteJid) {
      const number = (lead?.numero_whatsapp_lead ?? '').replace(/\D/g, '')
      if (!number) throw new Error('Lead sem número de WhatsApp.')
      remoteJid = `${number}@s.whatsapp.net`
    }
    return { lead, remoteJid }
  }

  async function createColuna(input: { nome: string; descricao?: string }): Promise<ColumnRow> {
    const targetFunil = activeFunilId.value ?? ctx.value.funilId
    if (!ctx.value.companyId || !targetFunil) {
      throw new Error('Empresa ou funil não configurado.')
    }
    const nome = input.nome.trim()
    if (!nome) throw new Error('Nome da coluna obrigatório.')
    const { data, error } = await supabase
      .from('ff_colunas_funil')
      .insert({
        nome_coluna: nome,
        descricao: input.descricao?.trim() || null,
        funil_id: targetFunil,
        companie_id: ctx.value.companyId,
        user_id: authUser.value?.id ?? null,
      })
      .select('*')
      .maybeSingle()
    if (error) throw error
    if (!data) {
      throw new Error('INSERT bloqueado pelo RLS (requer OWNER).')
    }
    await refreshColumns()
    return data as ColumnRow
  }

  async function updateColuna(
    id: number,
    patch: { nome?: string; descricao?: string | null },
  ): Promise<void> {
    const update: Database['public']['Tables']['ff_colunas_funil']['Update'] = {}
    if (patch.nome !== undefined) {
      const nome = patch.nome.trim()
      if (!nome) throw new Error('Nome da coluna obrigatório.')
      update.nome_coluna = nome
    }
    if (patch.descricao !== undefined) {
      update.descricao = patch.descricao?.trim() || null
    }
    const { data, error } = await supabase
      .from('ff_colunas_funil')
      .update(update)
      .eq('id', id)
      .select('id')
    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('UPDATE bloqueado. Colunas fixas não podem ser editadas.')
    }
    await refreshColumns()
  }

  async function deleteColuna(id: number): Promise<void> {
    const cols = columns.value ?? []
    const target = cols.find((c) => c.id === id)
    if (!target) throw new Error('Coluna não encontrada.')
    if (target.role) throw new Error('Colunas fixas não podem ser excluídas.')

    const novoCol = cols.find((c) => c.role === 'novo')
    if (!novoCol) throw new Error('Coluna "Novo" não encontrada no funil.')

    // Move leads pra coluna "Novo" antes de excluir (FK ON DELETE seria RESTRICT).
    const { error: mvErr } = await supabase
      .from('leads')
      .update({ coluna_id: novoCol.id })
      .eq('coluna_id', id)
    if (mvErr) throw mvErr

    const { data, error } = await supabase
      .from('ff_colunas_funil')
      .delete()
      .eq('id', id)
      .select('id')
    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('DELETE bloqueado pelo RLS (requer OWNER).')
    }
    await refreshColumns()
    await refreshLeads()
  }

  async function getOrCreateConversationForLead(leadId: number) {
    const { remoteJid } = await ensureLeadRemoteJid(leadId)
    const cid = ctx.value.companyId ?? (await loadContext()).companyId
    if (!cid) throw new Error('Empresa não configurada.')

    const { data: existing, error: selErr } = await supabase
      .from('whats_conversa')
      .select('id')
      .eq('companies_id', cid)
      .eq('lead_id', leadId)
      .limit(1)
      .maybeSingle()
    if (selErr) throw selErr
    if (existing?.id) return existing.id as number

    const { data: inserted, error: insErr } = await supabase
      .from('whats_conversa')
      .insert({
        companies_id: cid,
        lead_id: leadId,
        remoteJid,
        user_id: authUser.value?.id ?? null,
      } as never)
      .select('id')
      .single()
    if (insErr) throw insErr
    return (inserted as { id: number }).id
  }

  return {
    columns,
    leads,
    leadsByColumn,
    countByColumn,
    moveLead,
    createLead,
    deleteLead,
    updateLead,
    toggleIa,
    createColuna,
    updateColuna,
    deleteColuna,
    getOrCreateConversationForLead,
    refreshLeads,
    refreshColumns,
    columnsPending,
    leadsPending,
    funilId,
    companyId,
  }
}
