import type { Database } from '~~/types/database'

type MsgStatus =
  Database['public']['Tables']['whats_mensagens_conversa']['Row']['status']

type Conversation = {
  id: number
  remoteJid: string | null
  lead_id: number | null
  companies_id: string | null
  created_at: string
  last_read_at: string | null
  leads: {
    id: number
    nome_lead: string | null
    numero_whatsapp_lead: string | null
    resumo_lead: string | null
    ia_ativa: boolean
  } | null
  last_message: string | null
  last_message_at: string | null
  last_message_tipo: string | null
  last_message_status: MsgStatus | null
  unread_count: number
}

type Message = Database['public']['Tables']['whats_mensagens_conversa']['Row']

async function loadCompanyId(
  supabase: ReturnType<typeof useSupabaseClient<Database>>,
  userId: string | null | undefined,
): Promise<string | null> {
  if (!userId) return null
  const { data, error } = await supabase
    .from('users')
    .select('companie_id')
    .eq('id', userId)
    .maybeSingle()
  if (error) return null
  return data?.companie_id ?? null
}

type AttendantSignature = { nome: string | null; cargo: string | null }

async function loadSignature(
  supabase: ReturnType<typeof useSupabaseClient<Database>>,
  userId: string | null | undefined,
): Promise<AttendantSignature> {
  if (!userId) return { nome: null, cargo: null }
  const { data, error } = await supabase
    .from('users')
    .select('nome, cargo_chat')
    .eq('id', userId)
    .maybeSingle()
  if (error) return { nome: null, cargo: null }
  return {
    nome: data?.nome ?? null,
    cargo: (data as { cargo_chat?: string | null })?.cargo_chat ?? null,
  }
}

function buildPrefixed(text: string, sig: AttendantSignature): string {
  const nome = sig.nome?.trim()
  const cargo = sig.cargo?.trim()
  if (!nome || !cargo) return text
  return `*${nome} - ${cargo}*\n\n${text}`
}

export function useChats() {
  const supabase = useSupabaseClient<Database>()
  const authUser = useSupabaseUser()

  const companyId = useState<string | null>('chat-company-id', () => null)
  const selectedId = useState<number | null>('chat-selected', () => null)

  const {
    data: conversations,
    refresh: refreshConversations,
    pending: convPending,
  } = useAsyncData<Conversation[]>(
    'conversations',
    async () => {
      const cid = await loadCompanyId(supabase, authUser.value?.id)
      companyId.value = cid
      if (!cid) return []
      const { data, error } = await supabase.rpc('chat_list' as never, {
        p_company_id: cid,
      } as never)
      if (error) throw error
      const rows = (data ?? []) as unknown as Array<{
        id: number
        remoteJid: string | null
        lead_id: number | null
        companies_id: string | null
        created_at: string
        last_read_at: string | null
        lead_nome: string | null
        lead_numero: string | null
        lead_resumo: string | null
        lead_ia_ativa: boolean | null
        last_message: string | null
        last_message_at: string | null
        last_message_tipo: string | null
        last_message_status: MsgStatus | null
        unread_count: number
      }>
      return rows.map<Conversation>((r) => ({
        id: r.id,
        remoteJid: r.remoteJid,
        lead_id: r.lead_id,
        companies_id: r.companies_id,
        created_at: r.created_at,
        last_read_at: r.last_read_at,
        leads: r.lead_id
          ? {
              id: r.lead_id,
              nome_lead: r.lead_nome,
              numero_whatsapp_lead: r.lead_numero,
              resumo_lead: r.lead_resumo,
              ia_ativa: !!r.lead_ia_ativa,
            }
          : null,
        last_message: r.last_message,
        last_message_at: r.last_message_at,
        last_message_tipo: r.last_message_tipo,
        last_message_status: r.last_message_status,
        unread_count: Number(r.unread_count ?? 0),
      }))
    },
    { watch: [() => authUser.value?.id], default: () => [] },
  )

  const {
    data: messages,
    refresh: refreshMessages,
    pending: msgsPending,
  } = useAsyncData<Message[]>(
    'conversation-messages',
    async () => {
      if (!selectedId.value) return []
      const { data, error } = await supabase
        .from('whats_mensagens_conversa')
        .select('*')
        .eq('whats_conversa_id', selectedId.value)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    { watch: [selectedId], default: () => [] },
  )

  const selectedConversation = computed<Conversation | null>(() => {
    return (
      conversations.value?.find((c) => c.id === selectedId.value) ?? null
    )
  })

  const togglingIa = ref(false)
  async function toggleLeadIa(leadId: number, next: boolean) {
    togglingIa.value = true
    const list = conversations.value ?? []
    const updated = list.map((c) =>
      c.leads && c.leads.id === leadId
        ? { ...c, leads: { ...c.leads, ia_ativa: next } }
        : c,
    )
    conversations.value = updated
    try {
      const { error } = await supabase
        .from('leads')
        .update({ ia_ativa: next } as never)
        .eq('id', leadId)
      if (error) throw error
    } catch (err) {
      const revert = (conversations.value ?? []).map((c) =>
        c.leads && c.leads.id === leadId
          ? { ...c, leads: { ...c.leads, ia_ativa: !next } }
          : c,
      )
      conversations.value = revert
      throw err
    } finally {
      togglingIa.value = false
    }
  }

  async function clearMessages(conversationId: number) {
    const { data, error } = await supabase
      .from('whats_mensagens_conversa')
      .delete()
      .eq('whats_conversa_id', conversationId)
      .select('id')
    if (error) {
      console.error('[useChats] clearMessages', error)
      throw error
    }
    if (!data?.length) {
      throw new Error(
        'Nada foi removido. Verifique permissões (RLS) da conta.',
      )
    }
    if (selectedId.value === conversationId) {
      messages.value = []
    }
    await refreshConversations()
  }

  async function deleteConversation(conversationId: number) {
    const del1 = await supabase
      .from('whats_mensagens_conversa')
      .delete()
      .eq('whats_conversa_id', conversationId)
      .select('id')
    if (del1.error) {
      console.error('[useChats] delete messages', del1.error)
      throw del1.error
    }
    const del2 = await supabase
      .from('whats_conversa')
      .delete()
      .eq('id', conversationId)
      .select('id')
    if (del2.error) {
      console.error('[useChats] delete conversa', del2.error)
      throw del2.error
    }
    if (!del2.data?.length) {
      throw new Error(
        'Conversa não removida. Verifique permissões (RLS) da conta.',
      )
    }
    if (selectedId.value === conversationId) {
      selectedId.value = null
      messages.value = []
    }
    await refreshConversations()
  }

  async function markConversationSeen(id: number) {
    await supabase
      .from('whats_mensagens_conversa')
      .update({ visto: true } as never)
      .eq('whats_conversa_id', id)
      .eq('status', 'Recebida')
      .eq('visto', false)
  }

  const unreadGlobal = useState<number>('chats-unread-count', () => 0)

  async function selectConversation(id: number) {
    selectedId.value = id
    const list = conversations.value ?? []
    const idx = list.findIndex((c) => c.id === id)
    let decrement = 0
    if (idx !== -1) {
      decrement = list[idx]!.unread_count ?? 0
      const next = list.slice()
      next[idx] = { ...next[idx]!, unread_count: 0 }
      conversations.value = next
    }
    if (decrement > 0) {
      unreadGlobal.value = Math.max(0, (unreadGlobal.value ?? 0) - decrement)
    }
    await markConversationSeen(id)
  }

  function extractNumber(raw: string | null | undefined): string | null {
    if (!raw) return null
    if (raw.includes('@')) {
      const left = raw.split('@')[0] ?? ''
      return /^\d+$/.test(left) ? left : null
    }
    const digits = raw.replace(/\D/g, '')
    if (!digits) return null
    if (digits.length === 10 || digits.length === 11) return '55' + digits
    return digits
  }

  async function sendText(text: string) {
    const c = selectedConversation.value
    if (!c || !companyId.value) throw new Error('Sem conversa selecionada.')
    const number =
      extractNumber(c.remoteJid) ??
      extractNumber(c.leads?.numero_whatsapp_lead)
    if (!number) throw new Error('Número WhatsApp inválido.')
    const trimmed = text.trim()
    if (!trimmed) return

    const signature = await loadSignature(supabase, authUser.value?.id)
    const finalText = buildPrefixed(trimmed, signature)

    // Optimistic insert
    const tempId = -Date.now()
    const optimistic: Message = {
      id: tempId,
      created_at: new Date().toISOString(),
      sender: authUser.value?.id ?? null,
      mensagem: finalText,
      tipo: 'text',
      midia_url: null,
      status: 'Enviada',
      lead_id: c.lead_id,
      whats_conversa_id: c.id,
    } as unknown as Message
    messages.value = [...(messages.value ?? []), optimistic]

    try {
      const { data: fnData, error } = await supabase.functions.invoke(
        'send_whatsapp_message',
        {
          method: 'POST',
          body: {
            company_id: companyId.value,
            number,
            text: finalText,
          },
        },
      )
      if (error) {
        let detail = error.message
        try {
          const ctx = (error as { context?: Response }).context
          if (ctx && typeof ctx.text === 'function') {
            const body = await ctx.text()
            if (body) detail = body
          }
        } catch {}
        throw new Error(detail)
      }
      if (fnData && typeof fnData === 'object' && 'error' in fnData) {
        throw new Error(String((fnData as { error: unknown }).error))
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('whats_mensagens_conversa')
        .insert({
          whats_conversa_id: c.id,
          lead_id: c.lead_id,
          sender: authUser.value?.id ?? null,
          mensagem: finalText,
          tipo: 'text',
          status: 'Enviada',
        } as never)
        .select()
        .single()
      if (insertErr) throw insertErr

      const list = messages.value ?? []
      const idx = list.findIndex((m) => m.id === tempId)
      if (idx !== -1 && inserted) {
        const next = list.slice()
        next[idx] = inserted as Message
        messages.value = next
      }

      refreshConversations()
    } catch (err) {
      messages.value = (messages.value ?? []).filter((m) => m.id !== tempId)
      throw err
    }
  }

  // Realtime subscriptions
  let threadChannel: ReturnType<typeof supabase.channel> | null = null
  let globalChannel: ReturnType<typeof supabase.channel> | null = null

  async function syncRealtimeAuth() {
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token ?? null
      // @ts-expect-error runtime method
      supabase.realtime.setAuth(token)
    } catch {}
  }

  if (import.meta.client) {
    // Sync JWT no socket — postgres_changes exige auth p/ passar RLS.
    syncRealtimeAuth()
    supabase.auth.onAuthStateChange(() => {
      syncRealtimeAuth()
    })

    // 1. Thread-level: messages of currently-open conversation
    watch(
      selectedId,
      async (id) => {
        if (threadChannel) {
          await supabase.removeChannel(threadChannel)
          threadChannel = null
        }
        if (!id) return
        await syncRealtimeAuth()
        threadChannel = supabase
          .channel(`conv-${id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'whats_mensagens_conversa',
              filter: `whats_conversa_id=eq.${id}`,
            },
            (payload) => {
              const row = payload.new as Message
              const list = messages.value ?? []
              if (list.find((m) => m.id === row.id)) return
              // Troca optimistic (id negativo) de mesmo texto por row real.
              const optimisticIdx = list.findIndex(
                (m) =>
                  typeof m.id === 'number' &&
                  m.id < 0 &&
                  m.mensagem === row.mensagem &&
                  row.status === 'Enviada',
              )
              if (optimisticIdx !== -1) {
                const next = list.slice()
                next[optimisticIdx] = row
                messages.value = next
              } else {
                messages.value = [...list, row]
              }
              // Conversa aberta: marca visto (evita unread incrementar).
              if (row.status === 'Recebida' && selectedId.value === id) {
                markConversationSeen(id)
              }
            },
          )
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('[useChats] thread channel status:', status)
            }
          })
      },
      { immediate: true },
    )

    // 2. Company-level: new conversations + any new message (to refresh list order/preview)
    watch(
      companyId,
      async (cid) => {
        if (globalChannel) {
          await supabase.removeChannel(globalChannel)
          globalChannel = null
        }
        if (!cid) return
        await syncRealtimeAuth()
        globalChannel = supabase
          .channel(`chats-company-${cid}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'whats_conversa',
              filter: `companies_id=eq.${cid}`,
            },
            () => {
              refreshConversations()
            },
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'whats_conversa',
              filter: `companies_id=eq.${cid}`,
            },
            () => {
              refreshConversations()
            },
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'whats_mensagens_conversa',
            },
            () => {
              // Qualquer nova mensagem → reordena lista (preview + created_at).
              refreshConversations()
            },
          )
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('[useChats] company channel status:', status)
            }
          })
      },
      { immediate: true },
    )

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      syncRealtimeAuth()
      refreshConversations()
      if (selectedId.value) refreshMessages()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    onBeforeUnmount(async () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      if (threadChannel) await supabase.removeChannel(threadChannel)
      if (globalChannel) await supabase.removeChannel(globalChannel)
    })
  }

  return {
    conversations,
    messages,
    selectedConversation,
    selectedId,
    selectConversation,
    sendText,
    refreshConversations,
    refreshMessages,
    convPending,
    msgsPending,
    companyId,
    toggleLeadIa,
    togglingIa,
    clearMessages,
    deleteConversation,
  }
}
