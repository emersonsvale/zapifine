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
    avatar_url: string | null
  } | null
  last_message: string | null
  last_message_at: string | null
  last_message_tipo: string | null
  last_message_status: MsgStatus | null
  unread_count: number
  isgrupo: boolean
  grupoNome: string | null
  avatar_url: string | null
  assigned_to: string | null
  assigned_nome: string | null
  setor_id: string | null
  setor_nome: string | null
  setor_cor: string | null
  provider: string | null
  funil_nome: string | null
  coluna_nome: string | null
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

// Singleton guard: only first caller sets up realtime subscriptions.
// Child components (ChatMessage, AudioRecorder, LinkLeadDialog) also call
// useChats() but skip channel creation — they only use returned methods.
let _useChatsPrimary = false

export function useChats() {
  const isPrimary = !_useChatsPrimary
  _useChatsPrimary = true

  const supabase = useSupabaseClient<Database>()
  const authUser = useSupabaseUser()
  const whatsApi = useWhatsApi()

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
        lead_avatar_url: string | null
        last_message: string | null
        last_message_at: string | null
        last_message_tipo: string | null
        last_message_status: MsgStatus | null
        unread_count: number
        assigned_to: string | null
        assigned_nome: string | null
        setor_id: string | null
        setor_nome: string | null
        setor_cor: string | null
        provider: string | null
        funil_nome: string | null
        coluna_nome: string | null
      }>

      const ids = rows.map((r) => r.id)
      const groupMap = new Map<
        number,
        { isgrupo: boolean; grupoNome: string | null; avatar_url: string | null }
      >()
      if (ids.length > 0) {
        const { data: gRows } = await supabase
          .from('whats_conversa')
          .select('id, isgrupo, "grupoNome", avatar_url' as never)
          .in('id', ids)
        for (const g of (gRows ?? []) as any[]) {
          groupMap.set(g.id, {
            isgrupo: Boolean(g.isgrupo),
            grupoNome: g.grupoNome ?? null,
            avatar_url: g.avatar_url ?? null,
          })
        }
      }

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
              avatar_url: r.lead_avatar_url ?? null,
            }
          : null,
        last_message: r.last_message,
        last_message_at: r.last_message_at,
        last_message_tipo: r.last_message_tipo,
        last_message_status: r.last_message_status,
        unread_count: Number(r.unread_count ?? 0),
        isgrupo: groupMap.get(r.id)?.isgrupo ?? false,
        grupoNome: groupMap.get(r.id)?.grupoNome ?? null,
        avatar_url: groupMap.get(r.id)?.avatar_url ?? null,
        assigned_to: r.assigned_to ?? null,
        assigned_nome: r.assigned_nome ?? null,
        setor_id: r.setor_id ?? null,
        setor_nome: r.setor_nome ?? null,
        setor_cor: r.setor_cor ?? null,
        provider: r.provider ?? null,
        funil_nome: r.funil_nome ?? null,
        coluna_nome: r.coluna_nome ?? null,
      }))
    },
    { watch: [() => authUser.value?.id], default: () => [] },
  )

  const MSGS_PAGE_SIZE = 50

  const messages = useState<Message[]>('chat-messages', () => [])
  const msgsPending = useState<boolean>('chat-msgs-pending', () => false)
  const msgsLoadingOlder = useState<boolean>('chat-msgs-loading-older', () => false)
  const msgsHasMore = useState<boolean>('chat-msgs-has-more', () => false)

  async function fetchMessagesPage(
    conversaId: number,
    before: { created_at: string; id: number } | null,
    limit: number,
  ): Promise<Message[]> {
    let q = supabase
      .from('whats_mensagens_conversa')
      .select('*')
      .eq('whats_conversa_id', conversaId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit)
    if (before) {
      q = q.or(
        `created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`,
      )
    }
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).slice().reverse()
  }

  let loadInitialToken = 0
  async function loadInitialMessages(conversaId: number) {
    const token = ++loadInitialToken
    messages.value = []
    msgsPending.value = true
    msgsHasMore.value = false
    try {
      const page = await fetchMessagesPage(conversaId, null, MSGS_PAGE_SIZE)
      if (token !== loadInitialToken || selectedId.value !== conversaId) return
      messages.value = page
      msgsHasMore.value = page.length === MSGS_PAGE_SIZE
    } finally {
      if (token === loadInitialToken) msgsPending.value = false
    }
  }

  async function loadOlderMessages() {
    if (!selectedId.value) return
    if (msgsLoadingOlder.value || !msgsHasMore.value) return
    const list = messages.value ?? []
    const oldest = list.find(
      (m) => typeof m.id === 'number' && m.id > 0 && m.created_at,
    )
    if (!oldest) return
    msgsLoadingOlder.value = true
    try {
      const page = await fetchMessagesPage(
        selectedId.value,
        { created_at: oldest.created_at as string, id: oldest.id as number },
        MSGS_PAGE_SIZE,
      )
      if (page.length < MSGS_PAGE_SIZE) msgsHasMore.value = false
      if (page.length === 0) return
      const seen = new Set(list.map((m) => m.id))
      const merged = [...page.filter((m) => !seen.has(m.id)), ...list]
      messages.value = merged
    } finally {
      msgsLoadingOlder.value = false
    }
  }

  async function refreshMessages() {
    if (!selectedId.value) {
      messages.value = []
      msgsHasMore.value = false
      return
    }
    await loadInitialMessages(selectedId.value)
  }

  watch(selectedId, async (id) => {
    if (!id) {
      messages.value = []
      msgsHasMore.value = false
      return
    }
    await loadInitialMessages(id)
  })

  const selectedConversation = computed<Conversation | null>(() => {
    return (
      conversations.value?.find((c) => c.id === selectedId.value) ?? null
    )
  })

  const togglingIa = ref(false)
  async function toggleLeadIa(leadId: number, next: boolean, conversaId?: number) {
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
      if (conversaId) {
        const path = next
          ? `/api/ai/conversation/${conversaId}/resume`
          : `/api/ai/conversation/${conversaId}/pause`
        try {
          await $fetch(path, { method: 'POST' })
        } catch {
          // best effort: estado por lead já foi atualizado
        }
      }
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

  async function reactMessage(message: Message, reaction: string) {
    const c = selectedConversation.value
    if (!c || !companyId.value) throw new Error('Sem conversa selecionada.')
    const idMensagem = (message as unknown as { id_mensagem?: string | null }).id_mensagem
    if (!idMensagem) throw new Error('Mensagem sem ID do WhatsApp (não pode reagir).')
    const number =
      extractNumber(c.remoteJid) ??
      extractNumber(c.leads?.numero_whatsapp_lead)
    if (!number) throw new Error('Número WhatsApp inválido.')

    const currentReaction = (message as unknown as { reacao?: string | null }).reacao ?? ''
    const nextReaction = currentReaction === reaction ? '' : reaction

    // Optimistic
    const list = messages.value ?? []
    const idx = list.findIndex((m) => m.id === message.id)
    if (idx !== -1) {
      const next = list.slice()
      next[idx] = { ...(next[idx] as any), reacao: nextReaction } as Message
      messages.value = next
    }

    try {
      await whatsApi.react({
        company_id: companyId.value,
        number,
        messageId: idMensagem,
        reaction: nextReaction,
      })
      await supabase
        .from('whats_mensagens_conversa')
        .update({ reacao: nextReaction || null } as never)
        .eq('id', message.id)
      trackMessageUsage()
    } catch (err) {
      // rollback
      if (idx !== -1) {
        const rollback = (messages.value ?? []).slice()
        rollback[idx] = { ...(rollback[idx] as any), reacao: currentReaction } as Message
        messages.value = rollback
      }
      throw err
    }
  }

  async function editMessage(message: Message, newText: string) {
    const c = selectedConversation.value
    if (!c || !companyId.value) throw new Error('Sem conversa selecionada.')
    const idMensagem = (message as unknown as { id_mensagem?: string | null }).id_mensagem
    if (!idMensagem) throw new Error('Mensagem sem ID do WhatsApp (não pode editar).')
    const chat = c.remoteJid ?? c.leads?.numero_whatsapp_lead ?? null
    if (!chat) throw new Error('Chat (remoteJid) inválido.')
    const trimmed = newText.trim()
    if (!trimmed) throw new Error('Mensagem vazia.')
    const prevText = (message as unknown as { mensagem?: string | null }).mensagem ?? ''
    if (trimmed === prevText.trim()) return

    const list = messages.value ?? []
    const idx = list.findIndex((m) => m.id === message.id)
    if (idx !== -1) {
      const next = list.slice()
      next[idx] = { ...(next[idx] as any), mensagem: trimmed, editada: true } as Message
      messages.value = next
    }

    try {
      await whatsApi.edit({
        company_id: companyId.value,
        chat,
        message: trimmed,
        messageId: idMensagem,
      })
      const { error: updErr } = await supabase
        .from('whats_mensagens_conversa')
        .update({ mensagem: trimmed, editada: true } as never)
        .eq('id', message.id)
      if (updErr) throw updErr
      trackMessageUsage()
    } catch (err) {
      if (idx !== -1) {
        const rollback = (messages.value ?? []).slice()
        rollback[idx] = { ...(rollback[idx] as any), mensagem: prevText, editada: (message as any).editada ?? false } as Message
        messages.value = rollback
      }
      throw err
    }
  }

  async function deleteMessage(message: Message) {
    const c = selectedConversation.value
    if (!c || !companyId.value) throw new Error('Sem conversa selecionada.')
    const idMensagem = (message as unknown as { id_mensagem?: string | null }).id_mensagem
    if (!idMensagem) throw new Error('Mensagem sem ID do WhatsApp (não pode apagar).')
    const chat = c.remoteJid ?? c.leads?.numero_whatsapp_lead ?? null
    if (!chat) throw new Error('Chat (remoteJid) inválido.')

    const list = messages.value ?? []
    const idx = list.findIndex((m) => m.id === message.id)
    const prev = idx !== -1 ? { ...(list[idx] as any) } : null
    if (idx !== -1) {
      const next = list.slice()
      next[idx] = { ...(next[idx] as any), deletada: true } as Message
      messages.value = next
    }

    try {
      await whatsApi.del({
        company_id: companyId.value,
        chat,
        messageId: idMensagem,
      })
      const { error: updErr } = await supabase
        .from('whats_mensagens_conversa')
        .update({ deletada: true } as never)
        .eq('id', message.id)
      if (updErr) throw updErr
      trackMessageUsage()
    } catch (err) {
      if (idx !== -1 && prev) {
        const rollback = (messages.value ?? []).slice()
        rollback[idx] = prev as Message
        messages.value = rollback
      }
      throw err
    }
  }

  async function sendNote(text: string) {
    const c = selectedConversation.value
    if (!c) throw new Error('Sem conversa selecionada.')
    const trimmed = text.trim()
    if (!trimmed) return
    const { data: inserted, error } = await supabase
      .from('whats_mensagens_conversa')
      .insert({
        whats_conversa_id: c.id,
        lead_id: c.lead_id,
        sender: authUser.value?.id ?? null,
        mensagem: trimmed,
        tipo: 'note',
        status: 'Enviada',
        interna: true,
      } as never)
      .select()
      .single()
    if (error) throw error
    if (inserted) {
      messages.value = [...(messages.value ?? []), inserted as Message]
    }
  }

  async function assignConversation(
    conversationId: number,
    userId: string | null,
  ) {
    const list = conversations.value ?? []
    const idx = list.findIndex((c) => c.id === conversationId)
    const prev = idx !== -1 ? list[idx]! : null
    if (prev) {
      const assignedNome = userId
        ? authUser.value?.id === userId
          ? ((authUser.value?.user_metadata as { nome?: string })?.nome ?? 'Você')
          : prev.assigned_nome
        : null
      const next = list.slice()
      next[idx] = {
        ...prev,
        assigned_to: userId,
        assigned_nome: assignedNome,
      }
      conversations.value = next
    }
    const { error } = await supabase
      .from('whats_conversa')
      .update({
        assigned_to: userId,
        assigned_at: userId ? new Date().toISOString() : null,
      } as never)
      .eq('id', conversationId)
    if (error) {
      if (prev) {
        const rollback = (conversations.value ?? []).slice()
        const j = rollback.findIndex((c) => c.id === conversationId)
        if (j !== -1) rollback[j] = prev
        conversations.value = rollback
      }
      throw error
    }
    await refreshConversations()
  }

  async function transferToUser(
    conversationId: number,
    toUserId: string,
    nota?: string | null,
  ) {
    const { data, error } = await supabase.rpc(
      'transferir_conversa_user' as never,
      {
        p_conversa_id: conversationId,
        p_to_user_id: toUserId,
        p_nota: nota ?? null,
      } as never,
    )
    if (error) throw error
    await refreshConversations()
    return data as unknown as {
      ok: boolean
      conversa_id: number
      assigned_to: string
      setor_id: string | null
      notification_id: string
    }
  }

  async function transferToSetor(
    conversationId: number,
    setorId: string,
    nota?: string | null,
  ) {
    const { data, error } = await supabase.rpc(
      'transferir_conversa_setor' as never,
      {
        p_conversa_id: conversationId,
        p_setor_id: setorId,
        p_nota: nota ?? null,
      } as never,
    )
    if (error) throw error
    await refreshConversations()
    return data as unknown as {
      ok: boolean
      conversa_id: number
      setor_id: string
      notified_count: number
    }
  }

  async function linkLead(conversationId: number, leadId: number) {
    const { data, error } = await supabase
      .from('whats_conversa')
      .update({ lead_id: leadId } as never)
      .eq('id', conversationId)
      .select('id, lead_id')
    if (error) throw error
    if (!data?.length) {
      throw new Error('Não foi possível vincular o lead (verifique RLS).')
    }
    await refreshConversations()
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
    ensureLeadAvatar(id)
  }

  function trackMessageUsage() {
    if (!companyId.value) return
    // Fire-and-forget: nao bloqueia UX mesmo se falhar.
    supabase.functions
      .invoke('acrescentar_uso_mensal', {
        method: 'POST',
        body: { companie_id: companyId.value, add_mensagens: 1 },
      })
      .catch((err) => console.warn('[useChats] track usage fail', err))
  }

  const avatarInFlight = new Set<number>()
  async function ensureLeadAvatar(conversationId: number) {
    if (!companyId.value) return
    const list = conversations.value ?? []
    const conv = list.find((c) => c.id === conversationId)
    if (!conv || !conv.leads?.id) return
    if (conv.isgrupo) return
    if (conv.leads.avatar_url) return
    if (avatarInFlight.has(conv.leads.id)) return
    const number =
      conv.leads.numero_whatsapp_lead ?? conv.remoteJid ?? null
    if (!number) return
    avatarInFlight.add(conv.leads.id)
    try {
      const { data: fnData, error } = await supabase.functions.invoke<{
        avatar_url: string | null
      }>('fetch_lead_avatar', {
        method: 'POST',
        body: {
          company_id: companyId.value,
          lead_id: conv.leads.id,
          number,
        },
      })
      if (error) return
      const url = fnData?.avatar_url ?? null
      if (!url) return
      const current = conversations.value ?? []
      const next = current.map((c) =>
        c.leads && c.leads.id === conv.leads!.id
          ? { ...c, leads: { ...c.leads, avatar_url: url } }
          : c,
      )
      conversations.value = next
    } catch {
      // silencioso — avatar é best-effort
    } finally {
      avatarInFlight.delete(conv.leads.id)
    }
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

  async function sendText(
    text: string,
    opts: {
      quotedMessageId?: string | null
      mentioned?: string[] | null
    } = {},
  ) {
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
    const quotedMessageId = opts.quotedMessageId?.trim() || null
    const mentioned = (opts.mentioned ?? []).filter((j) => j && j.trim())

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
      quoted_message_id: quotedMessageId,
    } as unknown as Message
    messages.value = [...(messages.value ?? []), optimistic]

    try {
      const fnData = await whatsApi.sendText({
        company_id: companyId.value,
        number,
        text: finalText,
        conversa_id: c.id,
        pause_ai: true,
        ...(quotedMessageId
          ? { quoted_message_id: quotedMessageId, ...(c.remoteJid ? { quoted_chat: c.remoteJid } : {}) }
          : {}),
        ...(mentioned.length > 0 ? { mentioned } : {}),
      })
      const messageId = fnData?._messageId ?? null

      const row = {
        whats_conversa_id: c.id,
        lead_id: c.lead_id,
        sender: authUser.value?.id ?? null,
        mensagem: finalText,
        tipo: 'text',
        status: 'Enviada',
        id_mensagem: messageId,
        quoted_message_id: quotedMessageId,
      }
      const query = messageId
        ? supabase
            .from('whats_mensagens_conversa')
            .upsert(row as never, {
              onConflict: 'id_mensagem',
              ignoreDuplicates: false,
            } as never)
        : supabase.from('whats_mensagens_conversa').insert(row as never)
      const { data: inserted, error: insertErr } = await query.select().single()
      if (insertErr) {
        console.error('[sendText] insert error', insertErr, 'row:', row)
        throw insertErr
      }

      const list = messages.value ?? []
      const idx = list.findIndex((m) => m.id === tempId)
      if (idx !== -1 && inserted) {
        const next = list.slice()
        next[idx] = inserted as Message
        messages.value = next
      }

      trackMessageUsage()
      refreshConversations()
    } catch (err) {
      messages.value = (messages.value ?? []).filter((m) => m.id !== tempId)
      throw err
    }
  }

  type RichKind = 'media' | 'link' | 'location' | 'contact' | 'poll'

  type RichPayload = {
    type: RichKind
    url?: string
    caption?: string
    filename?: string
    mimetype?: string
    mediaType?: string
    text?: string
    title?: string
    description?: string
    latitude?: number
    longitude?: number
    name?: string
    contacts?: unknown[]
    options?: string[]
  }

  function previewForKind(p: RichPayload): { tipo: string; mensagem: string; midia_url: string | null } {
    switch (p.type) {
      case 'media':
        return {
          tipo: p.mediaType || 'midia',
          mensagem: p.caption ?? p.filename ?? '[mídia enviada]',
          midia_url: p.url ?? null,
        }
      case 'link':
        return { tipo: 'link', mensagem: p.text ?? p.url ?? '[link]', midia_url: p.url ?? null }
      case 'location':
        return {
          tipo: 'localizacao',
          mensagem: p.name ?? `📍 ${p.latitude}, ${p.longitude}`,
          midia_url: null,
        }
      case 'contact':
        return { tipo: 'contato', mensagem: `[${p.contacts?.length ?? 0} contato(s)]`, midia_url: null }
      case 'poll':
        return {
          tipo: 'enquete',
          mensagem: `📊 ${p.name} — ${(p.options ?? []).join(' / ')}`,
          midia_url: null,
        }
    }
  }

  async function sendRichDispatch(
    company_id: string,
    number: string,
    p: RichPayload,
  ): Promise<{ _messageId: string | null } | null> {
    switch (p.type) {
      case 'media':
        if (!p.url) throw new Error('URL da mídia ausente.')
        return whatsApi.sendMedia({
          company_id,
          number,
          url: p.url,
          ...(p.caption ? { caption: p.caption } : {}),
          ...(p.filename ? { filename: p.filename } : {}),
          ...(p.mimetype ? { mimetype: p.mimetype } : {}),
          ...(p.mediaType ? { mediaType: p.mediaType as 'image' | 'video' | 'audio' | 'document' } : {}),
        })
      case 'link':
        if (!p.url) throw new Error('URL do link ausente.')
        return whatsApi.sendLink({
          company_id,
          number,
          url: p.url,
          ...(p.text ? { text: p.text } : {}),
          ...(p.title ? { title: p.title } : {}),
          ...(p.description ? { description: p.description } : {}),
        })
      case 'location':
        if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number') {
          throw new Error('Latitude/longitude ausentes.')
        }
        return whatsApi.sendLocation({
          company_id,
          number,
          latitude: p.latitude,
          longitude: p.longitude,
          ...(p.name ? { name: p.name } : {}),
        })
      case 'contact':
        if (!p.contacts?.length) throw new Error('Contatos ausentes.')
        return whatsApi.sendContact({ company_id, number, contacts: p.contacts })
      case 'poll':
        if (!p.name || !p.options?.length) throw new Error('Enquete inválida.')
        return whatsApi.sendPoll({
          company_id,
          number,
          name: p.name,
          options: p.options,
        })
      default:
        throw new Error(`Tipo rich não suportado: ${p.type}`)
    }
  }

  async function sendRich(payload: RichPayload) {
    const c = selectedConversation.value
    if (!c || !companyId.value) throw new Error('Sem conversa selecionada.')
    const number =
      extractNumber(c.remoteJid) ??
      extractNumber(c.leads?.numero_whatsapp_lead)
    if (!number) throw new Error('Número WhatsApp inválido.')

    const preview = previewForKind(payload)

    const tempId = -Date.now()
    const optimistic: Message = {
      id: tempId,
      created_at: new Date().toISOString(),
      sender: authUser.value?.id ?? null,
      mensagem: preview.mensagem,
      tipo: preview.tipo,
      midia_url: preview.midia_url,
      status: 'Enviada',
      lead_id: c.lead_id,
      whats_conversa_id: c.id,
    } as unknown as Message
    messages.value = [...(messages.value ?? []), optimistic]

    try {
      const fnData = await sendRichDispatch(companyId.value, number, payload)
      const messageId = fnData?._messageId ?? null

      const row = {
        whats_conversa_id: c.id,
        lead_id: c.lead_id,
        sender: authUser.value?.id ?? null,
        mensagem: preview.mensagem,
        tipo: preview.tipo,
        midia_url: preview.midia_url,
        status: 'Enviada',
        id_mensagem: messageId,
      }
      const query = messageId
        ? supabase
            .from('whats_mensagens_conversa')
            .upsert(row as never, {
              onConflict: 'id_mensagem',
              ignoreDuplicates: false,
            } as never)
        : supabase.from('whats_mensagens_conversa').insert(row as never)
      const { data: inserted, error: insertErr } = await query.select().single()
      if (insertErr) {
        console.error('[sendRich] insert error', insertErr, 'row:', row)
        throw insertErr
      }

      const list = messages.value ?? []
      const idx = list.findIndex((m) => m.id === tempId)
      if (idx !== -1 && inserted) {
        const next = list.slice()
        next[idx] = inserted as Message
        messages.value = next
      }
      trackMessageUsage()
      refreshConversations()
    } catch (err) {
      messages.value = (messages.value ?? []).filter((m) => m.id !== tempId)
      throw err
    }
  }

  // Presence state (digitando/gravando)
  const presenceState = useState<string | null>('chat-presence-state', () => null)
  const presenceMedia = useState<string | null>('chat-presence-media', () => null)
  const presenceUpdatedAt = useState<number>('chat-presence-updated-at', () => 0)
  let presenceExpireTimer: ReturnType<typeof setTimeout> | null = null

  const PRESENCE_TTL_MS = 15_000

  function scheduleExpirePresence() {
    if (presenceExpireTimer) clearTimeout(presenceExpireTimer)
    presenceExpireTimer = setTimeout(() => {
      if (Date.now() - presenceUpdatedAt.value >= PRESENCE_TTL_MS) {
        presenceState.value = null
        presenceMedia.value = null
      }
    }, PRESENCE_TTL_MS + 100)
  }

  function applyPresenceRow(row: {
    conversa_id: number
    state: string | null
    media: string | null
    updated_at: string | null
  }) {
    const ts = row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
    presenceUpdatedAt.value = ts
    presenceState.value = row.state ?? null
    presenceMedia.value = row.media ?? null
    scheduleExpirePresence()
  }

  function patchConversationFromMessage(row: Message) {
    const convId = (row as unknown as { whats_conversa_id?: number | null })
      .whats_conversa_id
    if (!convId) return
    const list = conversations.value ?? []
    const idx = list.findIndex((c) => c.id === convId)
    if (idx === -1) {
      // Conversa fora da lista — ainda não carregada. Refresh fallback.
      refreshConversations()
      return
    }
    const isRecebida = row.status === 'Recebida'
    const isOpen = selectedId.value === convId
    const prev = list[idx]!
    const patched: Conversation = {
      ...prev,
      last_message: row.mensagem ?? prev.last_message,
      last_message_at: (row.created_at as string) ?? prev.last_message_at,
      last_message_tipo: (row.tipo as string | null) ?? prev.last_message_tipo,
      last_message_status: row.status ?? prev.last_message_status,
      unread_count:
        isRecebida && !isOpen
          ? (prev.unread_count ?? 0) + 1
          : prev.unread_count ?? 0,
    }
    const rest = list.slice(0, idx).concat(list.slice(idx + 1))
    // Reordena: conversa patcheada no topo (ordenação por last_message_at desc).
    conversations.value = [patched, ...rest]
    if (isRecebida && !isOpen) {
      unreadGlobal.value = (unreadGlobal.value ?? 0) + 1
    }

    // Garante que mensagem aparece na view atual mesmo se thread channel
    // perder o evento (ex: durante janela de setup/teardown do canal).
    if (isOpen && row.id) {
      const msgs = messages.value ?? []
      if (!msgs.find((m) => m.id === row.id)) {
        const optimisticIdx = msgs.findIndex(
          (m) =>
            typeof m.id === 'number' &&
            m.id < 0 &&
            m.mensagem === row.mensagem &&
            row.status === 'Enviada',
        )
        if (optimisticIdx !== -1) {
          const next = msgs.slice()
          next[optimisticIdx] = row
          messages.value = next
        } else {
          messages.value = [...msgs, row]
        }
        if (isRecebida) markConversationSeen(convId)
      }
    }
  }

  function patchConversationFromRow(row: Record<string, unknown>) {
    const convId = row.id as number | undefined
    if (!convId) return
    const list = conversations.value ?? []
    const idx = list.findIndex((c) => c.id === convId)
    if (idx === -1) {
      refreshConversations()
      return
    }
    const prev = list[idx]!
    const nextLeadId =
      (row.lead_id as number | null | undefined) ?? prev.lead_id
    if (nextLeadId !== prev.lead_id) {
      // Vínculo de lead mudou — precisa buscar dados do lead via RPC.
      refreshConversations()
      return
    }
    const nextAssigned = (row.assigned_to as string | null | undefined) ?? null
    const nextSetor = (row.setor_id as string | null | undefined) ?? null
    if (nextAssigned !== prev.assigned_to || nextSetor !== prev.setor_id) {
      // Atribuição/setor mudou — refetch pra trazer assigned_nome / setor_nome / setor_cor.
      refreshConversations()
    }
    const nextAvatar = (row.avatar_url as string | null | undefined) ?? null
    if (nextAvatar !== prev.avatar_url) {
      const next = list.slice()
      next[idx] = { ...prev, avatar_url: nextAvatar }
      conversations.value = next
    }
  }

  // Realtime subscriptions
  let threadChannel: ReturnType<typeof supabase.channel> | null = null
  let globalChannel: ReturnType<typeof supabase.channel> | null = null
  let presenceChannel: ReturnType<typeof supabase.channel> | null = null
  let _threadChannelId: number | null = null
  let _presenceChannelId: number | null = null
  let _globalChannelCid: string | null = null

  async function syncRealtimeAuth() {
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token ?? null
      ;(supabase.realtime as { setAuth: (t: string | null) => void }).setAuth(token)
    } catch {}
  }

  async function teardownThreadChannel() {
    if (threadChannel) {
      await supabase.removeChannel(threadChannel)
      threadChannel = null
      _threadChannelId = null
    }
  }

  async function teardownPresenceChannel() {
    if (presenceChannel) {
      await supabase.removeChannel(presenceChannel)
      presenceChannel = null
      _presenceChannelId = null
    }
    if (presenceExpireTimer) {
      clearTimeout(presenceExpireTimer)
      presenceExpireTimer = null
    }
  }

  async function teardownGlobalChannel() {
    if (globalChannel) {
      await supabase.removeChannel(globalChannel)
      globalChannel = null
      _globalChannelCid = null
    }
  }

  let _threadLock: Promise<void> | null = null

  async function setupThreadChannel(id: number) {
    // Evita corrida: duas chamadas concorrentes pelo mesmo id.
    if (_threadChannelId === id) return
    if (_threadLock) {
      await _threadLock
      if (_threadChannelId === id) return
    }
    let release: () => void
    _threadLock = new Promise<void>((r) => { release = r })
    try {
      await teardownThreadChannel()
      await syncRealtimeAuth()
      // Seta sincrono pra evitar re-entrada antes do SUBSCRIBED
      _threadChannelId = id
      threadChannel = supabase
        .channel(`conv-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'whats_mensagens_conversa',
          },
          (payload) => {
            console.log('[useChats] thread INSERT msg:', (payload.new as any).id, 'status:', (payload.new as any).status)
            if (selectedId.value !== id) return
            const row = payload.new as Message
            const list = messages.value ?? []
            if (list.find((m) => m.id === row.id)) return
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
            if (row.status === 'Recebida' && selectedId.value === id) {
              markConversationSeen(id)
            }
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'whats_mensagens_conversa',
          },
          (payload) => {
            if (selectedId.value !== id) return
            const row = payload.new as Message
            const list = messages.value ?? []
            const idx = list.findIndex((m) => m.id === row.id)
            if (idx === -1) return
            const next = list.slice()
            next[idx] = { ...next[idx], ...row } as Message
            messages.value = next
          },
        )
        .subscribe(async (status) => {
          console.log('[useChats] thread channel status:', status)
          if (status === 'SUBSCRIBED') {
            // Safety net: busca mensagens que podem ter chegado durante setup
            try {
              const latest = await fetchMessagesPage(id, null, 5)
              if (selectedId.value === id && latest.length > 0) {
                const current = messages.value ?? []
                const existingIds = new Set(current.map((m) => m.id))
                const missing = latest.filter((m) => !existingIds.has(m.id))
                for (const fresh of missing) {
                  const optIdx = current.findIndex(
                    (o) =>
                      typeof o.id === 'number' &&
                      o.id < 0 &&
                      o.mensagem === fresh.mensagem &&
                      fresh.status === 'Enviada',
                  )
                  if (optIdx !== -1) current[optIdx] = fresh
                  else if (!existingIds.has(fresh.id)) current.push(fresh)
                }
                messages.value = current
              }
            } catch {}
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            if (_threadChannelId === id) _threadChannelId = null
            if (status !== 'CLOSED') console.warn('[useChats] thread channel error:', status)
          }
        })
    } finally {
      _threadLock = null
      release!()
    }
  }

  async function setupPresenceChannel(id: number) {
    if (_presenceChannelId === id) return
    await teardownPresenceChannel()
    _presenceChannelId = id
    presenceChannel = supabase
      .channel(`presence-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whats_presence',
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as {
            conversa_id: number
            state: string | null
            media: string | null
            updated_at: string | null
          }
          if (!row || row.conversa_id !== id) return
          applyPresenceRow(row)
        },
      )
      .subscribe()

    try {
      const { data: presRow } = await supabase
        .from('whats_presence' as never)
        .select('conversa_id, state, media, updated_at')
        .eq('conversa_id', id)
        .maybeSingle()
      if (presRow) applyPresenceRow(presRow as never)
    } catch {}
  }

  let _globalLock: Promise<void> | null = null

  async function setupGlobalChannel(cid: string) {
    if (_globalChannelCid === cid) return
    if (_globalLock) {
      await _globalLock
      if (_globalChannelCid === cid) return
    }
    let release: () => void
    _globalLock = new Promise<void>((r) => { release = r })
    try {
      await teardownGlobalChannel()
      await syncRealtimeAuth()
      // Seta sincrono pra evitar re-entrada antes do SUBSCRIBED
      _globalChannelCid = cid
      globalChannel = supabase
        .channel(`chats-company-${cid}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'whats_mensagens_conversa',
          },
          (payload) => {
            const row = payload.new as Message
            console.log('[useChats] global INSERT msg:', row.id, 'status:', row.status, 'conv:', (row as any).whats_conversa_id)
            patchConversationFromMessage(row)
          },
        )
        .subscribe((status) => {
          console.log('[useChats] global channel status:', status)
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            if (_globalChannelCid === cid) _globalChannelCid = null
            if (status !== 'CLOSED') console.warn('[useChats] global channel error:', status)
          }
        })
    } finally {
      _globalLock = null
      release!()
    }
  }

  if (import.meta.client && isPrimary) {
    syncRealtimeAuth()
    supabase.auth.onAuthStateChange(() => {
      syncRealtimeAuth()
    })

    watch(
      selectedId,
      async (id) => {
        await teardownThreadChannel()
        await teardownPresenceChannel()
        presenceState.value = null
        presenceMedia.value = null
        presenceUpdatedAt.value = 0
        if (!id) return
        await setupThreadChannel(id)
        await setupPresenceChannel(id)
      },
      { immediate: true },
    )

    watch(
      companyId,
      async (cid) => {
        if (!cid) {
          await teardownGlobalChannel()
          return
        }
        await setupGlobalChannel(cid)
      },
      { immediate: true },
    )

    let onVisibleRunning = false
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return
      if (onVisibleRunning) return
      // Só recria canais se realmente perdemos conexão (tab dormiu/background).
      // Focus normal não deve resetar canais saudáveis.
      const wasHidden = _onVisibleWasHidden
      _onVisibleWasHidden = false
      if (!wasHidden) return
      onVisibleRunning = true
      try {
        await syncRealtimeAuth()
        _globalChannelCid = null
        _threadChannelId = null
        _presenceChannelId = null
        const cid = companyId.value
        const sel = selectedId.value
        if (cid) await setupGlobalChannel(cid)
        if (sel) {
          await setupThreadChannel(sel)
          await setupPresenceChannel(sel)
        }
        await refreshConversations()
        if (sel) await refreshMessages()
      } finally {
        onVisibleRunning = false
      }
    }
    let _onVisibleWasHidden = false
    const _onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') _onVisibleWasHidden = true
      else onVisible()
    }
    document.addEventListener('visibilitychange', _onVisibilityChange)
    window.addEventListener('focus', onVisible)

    onBeforeUnmount(async () => {
      document.removeEventListener('visibilitychange', _onVisibilityChange)
      window.removeEventListener('focus', onVisible)
      await teardownThreadChannel()
      await teardownGlobalChannel()
      await teardownPresenceChannel()
    })
  }

  return {
    conversations,
    messages,
    selectedConversation,
    selectedId,
    selectConversation,
    sendText,
    sendRich,
    reactMessage,
    editMessage,
    deleteMessage,
    assignConversation,
    transferToUser,
    transferToSetor,
    sendNote,
    linkLead,
    refreshConversations,
    refreshMessages,
    convPending,
    msgsPending,
    companyId,
    toggleLeadIa,
    togglingIa,
    clearMessages,
    deleteConversation,
    presenceState,
    presenceMedia,
    loadOlderMessages,
    msgsHasMore,
    msgsLoadingOlder,
  }
}
