import type { Database } from '~~/types/database'

// Uniões estreitas (o tipo gerado do banco traz tipo/status/midia_tipo como text,
// já que são checks e não enums).
export type ScheduledMessageTipo = 'text' | 'media' | 'link'
export type ScheduledMessageStatus = 'pending' | 'sent' | 'failed' | 'canceled'
export type ScheduledMediaTipo = 'image' | 'video' | 'audio' | 'document'

export type ScheduledMessage = {
  id: string
  companies_id: string
  conversa_id: number
  lead_id: number | null
  created_by: string | null
  tipo: ScheduledMessageTipo
  mensagem: string | null
  midia_url: string | null
  midia_nome: string | null
  midia_mime: string | null
  midia_tipo: ScheduledMediaTipo | null
  link_url: string | null
  link_titulo: string | null
  link_descricao: string | null
  scheduled_at: string
  status: ScheduledMessageStatus
  attempts: number
  last_error: string | null
  sent_at: string | null
  id_mensagem: string | null
  created_at: string
  updated_at: string
}

export type ScheduledMessageDraft = {
  tipo: ScheduledMessageTipo
  mensagem: string | null
  midia_url?: string | null
  midia_nome?: string | null
  midia_mime?: string | null
  midia_tipo?: ScheduledMediaTipo | null
  link_url?: string | null
  link_titulo?: string | null
  link_descricao?: string | null
  scheduled_at: string
}

const TABLE = 'chat_mensagens_agendadas'

// Só o primeiro chamador (a página de chats) liga o watcher de conversa; os
// filhos (drawer, dialog) reusam o mesmo estado via useState.
let _watcherBound = false

export function useScheduledMessages() {
  const supabase = useSupabaseClient<Database>()
  const authUser = useSupabaseUser()
  const { selectedId, selectedConversation, companyId } = useChats()

  const items = useState<ScheduledMessage[]>('chat-scheduled-items', () => [])
  const pending = useState<boolean>('chat-scheduled-pending', () => false)
  const error = useState<string | null>('chat-scheduled-error', () => null)

  const pendingItems = computed(() =>
    items.value.filter((m) => m.status === 'pending'),
  )
  const pendingCount = computed(() => pendingItems.value.length)

  async function refresh() {
    const id = selectedId.value
    if (!id) {
      items.value = []
      return
    }
    pending.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from(TABLE)
        .select('*')
        .eq('conversa_id', id)
        .order('scheduled_at', { ascending: true })
      if (err) throw err
      if (selectedId.value !== id) return
      items.value = (data ?? []) as unknown as ScheduledMessage[]
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Falha ao carregar mensagens agendadas.'
      items.value = []
    } finally {
      pending.value = false
    }
  }

  if (!_watcherBound) {
    _watcherBound = true
    const stop = watch(selectedId, () => { void refresh() }, { immediate: true })
    // O watcher morre junto com o componente que o criou; libera a vaga pro
    // próximo (ex.: sair e voltar pra página de chats).
    if (getCurrentScope()) {
      onScopeDispose(() => {
        stop()
        _watcherBound = false
      })
    }
  }

  async function create(draft: ScheduledMessageDraft): Promise<ScheduledMessage> {
    const id = selectedId.value
    if (!id) throw new Error('Sem conversa selecionada.')
    const cid = companyId.value
    if (!cid) throw new Error('Empresa não identificada.')

    const row = {
      companies_id: cid,
      conversa_id: id,
      lead_id: selectedConversation.value?.lead_id ?? null,
      created_by: authUser.value?.id ?? null,
      tipo: draft.tipo,
      mensagem: draft.mensagem?.trim() || null,
      midia_url: draft.midia_url ?? null,
      midia_nome: draft.midia_nome ?? null,
      midia_mime: draft.midia_mime ?? null,
      midia_tipo: draft.midia_tipo ?? null,
      link_url: draft.link_url ?? null,
      link_titulo: draft.link_titulo ?? null,
      link_descricao: draft.link_descricao ?? null,
      scheduled_at: draft.scheduled_at,
      status: 'pending',
    }

    const { data, error: err } = await supabase
      .from(TABLE)
      .insert(row)
      .select()
      .single()
    if (err) throw err
    const created = data as unknown as ScheduledMessage
    items.value = [...items.value, created].sort((a, b) =>
      a.scheduled_at.localeCompare(b.scheduled_at),
    )
    return created
  }

  async function update(
    id: string,
    draft: ScheduledMessageDraft,
  ): Promise<ScheduledMessage> {
    const patch = {
      tipo: draft.tipo,
      mensagem: draft.mensagem?.trim() || null,
      midia_url: draft.midia_url ?? null,
      midia_nome: draft.midia_nome ?? null,
      midia_mime: draft.midia_mime ?? null,
      midia_tipo: draft.midia_tipo ?? null,
      link_url: draft.link_url ?? null,
      link_titulo: draft.link_titulo ?? null,
      link_descricao: draft.link_descricao ?? null,
      scheduled_at: draft.scheduled_at,
      // Reagendar (inclusive uma falha) devolve pra fila zerando as tentativas.
      status: 'pending',
      attempts: 0,
      last_error: null,
    }
    const { data, error: err } = await supabase
      .from(TABLE)
      .update(patch)
      .eq('id', id)
      .neq('status', 'sent')
      .select()
      .single()
    if (err) throw err
    const updated = data as unknown as ScheduledMessage
    items.value = items.value
      .map((m) => (m.id === id ? updated : m))
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    return updated
  }

  async function cancel(id: string): Promise<void> {
    const { data, error: err } = await supabase
      .from(TABLE)
      .update({ status: 'canceled' })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id')
    if (err) throw err
    if (!data?.length) {
      // Saiu de pending entre o clique e o update (worker já enviou).
      await refresh()
      throw new Error('Mensagem já não estava pendente.')
    }
    items.value = items.value.map((m) =>
      m.id === id ? { ...m, status: 'canceled' as const } : m,
    )
  }

  async function remove(id: string): Promise<void> {
    const { error: err } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id)
    if (err) throw err
    items.value = items.value.filter((m) => m.id !== id)
  }

  return {
    items,
    pendingItems,
    pendingCount,
    pending,
    error,
    refresh,
    create,
    update,
    cancel,
    remove,
  }
}
