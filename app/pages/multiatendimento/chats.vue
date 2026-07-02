<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import {
  Send,
  Paperclip,
  Mic,
  Phone,
  MoreVertical,
  MessageCircle,
  Users,
  Loader2,
  Bot,
  BotOff,
  Eraser,
  Trash2,
  UserRound,
  Image as ImageIcon,
  Link as LinkIcon,
  MapPin,
  User as UserIcon,
  BarChart3,
  UserPlus,
  Link2,
  X,
  ArrowRightLeft,
  ChevronDown,
} from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Lead = Database['public']['Tables']['leads']['Row']

useHead({ title: 'Chats - Zapifine' })
definePageMeta({ layout: 'chat' })

const {
  conversations,
  messages,
  selectedConversation,
  selectedId,
  selectConversation,
  sendText,
  sendRich,
  sendNote,
  refreshConversations,
  convPending,
  msgsPending,
  toggleLeadIa,
  togglingIa,
  clearMessages,
  deleteConversation,
  presenceState,
  presenceMedia,
  loadOlderMessages,
  msgsHasMore,
  msgsLoadingOlder,
  assignConversation,
  transferToUser,
  transferToSetor,
  companyId,
} = useChats()

const authUser = useSupabaseUser()
const { data: currentUser } = useCurrentUser()
const currentUserSetorId = computed(
  () => (currentUser.value as { setor_id?: string | null } | null)?.setor_id ?? null,
)

const isAssignedToMe = computed(
  () => !!selectedConversation.value?.assigned_to &&
    selectedConversation.value?.assigned_to === authUser.value?.id,
)
const assignedBadgeLabel = computed(() => {
  const c = selectedConversation.value
  if (!c?.assigned_to) return null
  if (c.assigned_to === authUser.value?.id) return 'Você'
  return c.assigned_nome ?? 'outro atendente'
})
const setorBadge = computed(() => {
  const c = selectedConversation.value
  if (!c?.setor_id) return null
  return {
    nome: c.setor_nome ?? 'Setor',
    cor: c.setor_cor ?? '#94a3b8',
  }
})
const canClaim = computed(() => {
  const c = selectedConversation.value
  if (!c) return false
  if (c.assigned_to) return false
  // Sem dono: pode assumir se for do meu setor OU não tem setor (livre).
  if (!c.setor_id) return true
  return c.setor_id === currentUserSetorId.value
})
const assigning = ref(false)

async function onAssignMe() {
  const c = selectedConversation.value
  if (!c || assigning.value) return
  assigning.value = true
  try {
    await assignConversation(c.id, authUser.value?.id ?? null)
    toast.success('Conversa atribuída a você.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao atribuir.')
  } finally {
    assigning.value = false
  }
}

const transferOpen = ref(false)
const transferMode = ref<'user' | 'setor'>('user')

function openTransfer(initial: 'user' | 'setor' = 'user') {
  if (!selectedConversation.value) return
  transferMode.value = initial
  transferOpen.value = true
}

async function onTransferUser(payload: { userId: string; nota: string | null }) {
  const c = selectedConversation.value
  if (!c) return
  try {
    await transferToUser(c.id, payload.userId, payload.nota)
    toast.success('Conversa transferida.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao transferir.')
    throw err
  }
}

async function onTransferSetor(payload: { setorId: string; nota: string | null }) {
  const c = selectedConversation.value
  if (!c) return
  try {
    const res = await transferToSetor(c.id, payload.setorId, payload.nota)
    toast.success(`Conversa enviada ao setor (${res.notified_count} notificado${res.notified_count === 1 ? '' : 's'}).`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao transferir.')
    throw err
  }
}

async function onAssignRelease() {
  const c = selectedConversation.value
  if (!c || assigning.value) return
  assigning.value = true
  try {
    await assignConversation(c.id, null)
    toast.success('Conversa liberada.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao liberar.')
  } finally {
    assigning.value = false
  }
}

const messagesScrollEl = ref<HTMLDivElement | null>(null)
const isNearBottom = ref(true)
const newMessagesCount = ref(0)

function updateNearBottom() {
  const el = messagesScrollEl.value
  if (!el) return
  // flex-col-reverse: scrollTop=0 = fundo visual (mensagens recentes)
  isNearBottom.value = el.scrollTop < 80
  if (isNearBottom.value) newMessagesCount.value = 0
}

function onMessagesScroll() {
  const el = messagesScrollEl.value
  if (!el) return
  updateNearBottom()
  if (!msgsHasMore.value || msgsLoadingOlder.value) return
  // flex-col-reverse: scroll visual pra cima = scrollTop cresce.
  const threshold = 200
  if (el.scrollTop >= el.scrollHeight - el.clientHeight - threshold) {
    loadOlderMessages()
  }
}

function scrollToLatest() {
  const el = messagesScrollEl.value
  if (!el) return
  el.scrollTo({ top: 0, behavior: 'smooth' })
  newMessagesCount.value = 0
}

watch(
  () => messages.value?.length ?? 0,
  (len, prev) => {
    if (len > (prev ?? 0) && !isNearBottom.value) {
      newMessagesCount.value += len - (prev ?? 0)
    }
  },
)

watch(selectedId, () => {
  newMessagesCount.value = 0
  isNearBottom.value = true
})

const showJumpButton = computed(
  () => !isNearBottom.value || newMessagesCount.value > 0,
)

const presenceLabel = computed(() => {
  if (presenceState.value !== 'composing') return ''
  return presenceMedia.value === 'audio' ? 'gravando áudio...' : 'digitando...'
})

const linkLeadOpen = ref(false)
const hasLead = computed(() => !!selectedConversation.value?.leads?.id)

function openLinkLead() {
  if (!selectedConversation.value) return
  linkLeadOpen.value = true
}

const attachMenuOpen = ref(false)
const mediaOpen = ref(false)
const linkOpen = ref(false)
const locationOpen = ref(false)
const contactOpen = ref(false)
const pollOpen = ref(false)

function openAttachment(kind: 'media' | 'link' | 'location' | 'contact' | 'poll') {
  attachMenuOpen.value = false
  if (kind === 'media') mediaOpen.value = true
  else if (kind === 'link') linkOpen.value = true
  else if (kind === 'location') locationOpen.value = true
  else if (kind === 'contact') contactOpen.value = true
  else if (kind === 'poll') pollOpen.value = true
}

async function onSendRich(
  type: 'media' | 'link' | 'location' | 'contact' | 'poll',
  payload: Record<string, unknown>,
) {
  errorMsg.value = ''
  try {
    await sendRich({ type, ...payload } as never)
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Falha ao enviar.'
    throw err
  }
}

const { leads, columns, refreshLeads } = useLeads()
const { toast, confirm } = useAlerts()

const drawerOpen = ref(false)

watch(drawerOpen, async (open, wasOpen) => {
  if (!open && wasOpen) {
    await Promise.all([refreshLeads(), refreshConversations()])
  }
})

const leadForDialog = computed<Lead | null>(() => {
  const leadId = selectedConversation.value?.leads?.id
  if (!leadId) return null
  return leads.value?.find((l) => l.id === leadId) ?? null
})

function openLeadDrawer() {
  if (!leadForDialog.value) {
    toast.info('Esta conversa não está vinculada a um lead.')
    return
  }
  drawerOpen.value = true
}

async function onClearMessages() {
  const c = selectedConversation.value
  if (!c) return
  const ok = await confirm({
    title: 'Limpar conversa',
    description:
      'Todas as mensagens desta conversa serão removidas. Esta ação não pode ser desfeita.',
    confirmLabel: 'Limpar mensagens',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await clearMessages(c.id)
    toast.success('Mensagens removidas.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao limpar.')
  }
}

async function onDeleteConversation() {
  const c = selectedConversation.value
  if (!c) return
  const ok = await confirm({
    title: 'Excluir conversa',
    description:
      'A conversa e todas as suas mensagens serão removidas permanentemente.',
    confirmLabel: 'Excluir tudo',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await deleteConversation(c.id)
    toast.success('Conversa excluída.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao excluir.')
  }
}

const route = useRoute()
const router = useRouter()
const pendingConvRefresh = ref(false)

watch(
  [() => route.query.conv, conversations],
  async ([queryConv, list]) => {
    if (!queryConv) return
    const target = Number(queryConv)
    if (!Number.isFinite(target)) return
    const found = (list ?? []).find((c) => c.id === target)
    if (!found) {
      if (pendingConvRefresh.value) return
      pendingConvRefresh.value = true
      await refreshConversations()
      pendingConvRefresh.value = false
      return
    }
    if (selectedId.value !== target) selectConversation(target)
    router.replace({ query: {} })
  },
  { immediate: true },
)

const iaAtiva = computed(
  () => selectedConversation.value?.leads?.ia_ativa ?? false,
)
async function onToggleIa() {
  const leadId = selectedConversation.value?.leads?.id
  if (!leadId) return
  try {
    await toggleLeadIa(leadId, !iaAtiva.value)
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : 'Falha ao alternar IA.'
  }
}

const input = ref('')
const inputEl = ref<HTMLTextAreaElement | null>(null)
const sending = ref(false)
const errorMsg = ref('')
const inputMode = ref<'message' | 'note'>('message')

const { map: participantsMap, nameFor: participantNameFor } = useParticipants()
const JID_SUFFIXES_COMPOSE = ['@s.whatsapp.net', '@c.us', '@lid', '@g.us']

type MentionOption = { jid: string; digits: string; name: string }

const groupParticipants = computed<MentionOption[]>(() => {
  if (!isGroupConv.value) return []
  const seen = new Set<string>()
  const out: MentionOption[] = []
  for (const m of (messages.value ?? [])) {
    const jid = (m as unknown as { quemmandou?: string | null }).quemmandou?.trim()
    if (!jid || seen.has(jid)) continue
    seen.add(jid)
    const digits = (jid.split('@')[0] ?? '').replace(/\D/g, '')
    if (!digits) continue
    out.push({ jid, digits, name: participantNameFor(jid) || digits })
  }
  for (const [jid, row] of Object.entries(participantsMap.value)) {
    if (seen.has(jid)) continue
    const digits = (jid.split('@')[0] ?? '').replace(/\D/g, '')
    if (!digits) continue
    seen.add(jid)
    out.push({ jid, digits, name: row.nome?.trim() || digits })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
})

const mentionQuery = ref<string | null>(null)
const mentionTokenStart = ref(0)
const mentionIndex = ref(0)

const mentionResults = computed<MentionOption[]>(() => {
  if (mentionQuery.value === null) return []
  const q = mentionQuery.value.toLowerCase()
  const list = groupParticipants.value
  if (!q) return list.slice(0, 8)
  return list
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.digits.includes(q),
    )
    .slice(0, 8)
})

const mentionOpen = computed(
  () =>
    isGroupConv.value &&
    inputMode.value === 'message' &&
    mentionQuery.value !== null &&
    mentionResults.value.length > 0,
)

function detectMention() {
  const el = inputEl.value
  if (!el || !isGroupConv.value || inputMode.value !== 'message') {
    mentionQuery.value = null
    return
  }
  const pos = el.selectionStart ?? input.value.length
  const before = input.value.slice(0, pos)
  const atIdx = before.lastIndexOf('@')
  if (atIdx < 0) {
    mentionQuery.value = null
    return
  }
  const prev = atIdx === 0 ? '' : before[atIdx - 1]
  if (prev && !/\s/.test(prev)) {
    mentionQuery.value = null
    return
  }
  const token = before.slice(atIdx + 1)
  if (/\s/.test(token)) {
    mentionQuery.value = null
    return
  }
  mentionTokenStart.value = atIdx
  mentionQuery.value = token
  mentionIndex.value = 0
}

function applyMention(opt: MentionOption) {
  const el = inputEl.value
  const pos = el?.selectionStart ?? input.value.length
  const before = input.value.slice(0, mentionTokenStart.value)
  const after = input.value.slice(pos)
  const insert = `@${opt.digits} `
  input.value = before + insert + after
  mentionQuery.value = null
  nextTick(() => {
    const newPos = before.length + insert.length
    el?.focus()
    el?.setSelectionRange(newPos, newPos)
  })
}

function collectMentionedJids(text: string): string[] {
  const out = new Set<string>()
  const all = groupParticipants.value
  const byDigits = new Map(all.map((p) => [p.digits, p.jid]))
  const re = /(?:^|\s)@(\d{5,})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const digits = m[1]!
    const jid = byDigits.get(digits)
    if (jid) {
      out.add(jid)
    } else {
      for (const sfx of JID_SUFFIXES_COMPOSE) {
        out.add(digits + sfx)
        break
      }
    }
  }
  return [...out]
}

type ThreadMessage = NonNullable<typeof messages.value>[number]
const replyingTo = ref<ThreadMessage | null>(null)

function startReply(m: ThreadMessage) {
  replyingTo.value = m
  nextTick(() => inputEl.value?.focus())
}

function cancelReply() {
  replyingTo.value = null
}

watch(selectedId, () => {
  replyingTo.value = null
  nextTick(autoResizeInput)
})

const replyPreview = computed(() => {
  const m = replyingTo.value
  if (!m) return { sender: '', text: '' }
  const tipo = (m.tipo ?? '').toLowerCase()
  let text = m.mensagem ?? ''
  if (!text) {
    if (['image', 'imagem', 'photo', 'picture'].includes(tipo)) text = '📷 Imagem'
    else if (['audio', 'voice', 'ptt'].includes(tipo)) text = '🎤 Áudio'
    else if (tipo === 'video') text = '🎬 Vídeo'
    else if (['document', 'file', 'pdf'].includes(tipo)) text = '📎 Documento'
  }
  return {
    sender: m.status === 'Recebida' ? 'Lead' : 'Você',
    text: text.replace(/[*_~`]/g, '').slice(0, 160),
  }
})

const messagesByWaId = computed(() => {
  const map = new Map<string, ThreadMessage>()
  for (const m of messages.value ?? []) {
    const waId = (m as unknown as { id_mensagem?: string | null }).id_mensagem
    if (waId) map.set(waId, m)
  }
  return map
})

function autoResizeInput() {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  const cs = getComputedStyle(el)
  const lineHeight = parseFloat(cs.lineHeight) || 20
  const paddingY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
  const borderY = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)
  const maxH = lineHeight * 8 + paddingY + borderY
  const newH = Math.min(el.scrollHeight + borderY, maxH)
  el.style.height = newH + 'px'
  el.style.overflowY = el.scrollHeight + borderY > maxH ? 'auto' : 'hidden'
}

watch(input, () => nextTick(autoResizeInput))
onMounted(() => autoResizeInput())

function insertEmoji(emoji: string) {
  const el = inputEl.value
  if (!el) {
    input.value += emoji
    return
  }
  const start = el.selectionStart ?? input.value.length
  const end = el.selectionEnd ?? input.value.length
  const before = input.value.slice(0, start)
  const after = input.value.slice(end)
  input.value = before + emoji + after
  nextTick(() => {
    el.focus()
    const pos = start + emoji.length
    el.setSelectionRange(pos, pos)
  })
}

async function send() {
  const text = input.value.trim()
  if (!text) return
  errorMsg.value = ''
  sending.value = true
  input.value = ''
  const quotedId = (replyingTo.value as unknown as { id_mensagem?: string | null })?.id_mensagem ?? null
  const prevReply = replyingTo.value
  replyingTo.value = null
  const mode = inputMode.value
  try {
    if (mode === 'note') {
      await sendNote(text)
    } else {
      const mentioned = collectMentionedJids(text)
      await sendText(text, { quotedMessageId: quotedId, mentioned })
    }
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : 'Falha ao enviar mensagem.'
    input.value = text
    replyingTo.value = prevReply
  } finally {
    sending.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (mentionOpen.value) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentionIndex.value = Math.min(
        mentionResults.value.length - 1,
        mentionIndex.value + 1,
      )
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentionIndex.value = Math.max(0, mentionIndex.value - 1)
      return
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const opt = mentionResults.value[mentionIndex.value]
      if (opt) applyMention(opt)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      mentionQuery.value = null
      return
    }
  }
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

const headerName = computed(() => {
  const c = selectedConversation.value
  if (!c) return ''
  if (c.isgrupo) return c.grupoNome?.trim() || 'Grupo'
  return (
    c.leads?.nome_lead?.trim() ||
    c.leads?.numero_whatsapp_lead ||
    c.remoteJid ||
    `#${c.id}`
  )
})
const headerNumber = computed(() => {
  const c = selectedConversation.value
  if (!c) return ''
  if (c.isgrupo) return 'Grupo'
  return c.leads?.numero_whatsapp_lead ?? c.remoteJid ?? ''
})
const headerInitial = computed(() => {
  const n = headerName.value
  return (n[0] ?? '?').toUpperCase()
})
const isGroupConv = computed(() => !!selectedConversation.value?.isgrupo)

type Message = NonNullable<typeof messages.value>[number]
type GroupedItem =
  | { type: 'day'; key: string; label: string }
  | { type: 'msg'; key: string; message: Message }

const weekdayFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
const fullDateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function daySeparatorLabel(iso: string) {
  const msgDay = startOfDay(new Date(iso))
  const today = startOfDay(new Date())
  const diffDays = Math.round((today - msgDay) / 86400000)
  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays > 1 && diffDays < 7) {
    const label = weekdayFmt.format(new Date(msgDay))
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  return fullDateFmt.format(new Date(msgDay))
}

function dayKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

const groupedMessages = computed<GroupedItem[]>(() => {
  const list = messages.value ?? []
  const days: { key: string; label: string; msgs: Message[] }[] = []
  let current: (typeof days)[number] | null = null
  for (const m of list) {
    const iso = m.created_at ?? new Date().toISOString()
    const k = dayKey(iso)
    if (!current || current.key !== k) {
      current = { key: k, label: daySeparatorLabel(iso), msgs: [] }
      days.push(current)
    }
    current.msgs.push(m)
  }
  // DOM emitido em ordem reversa do visual (p/ flex-col-reverse):
  // visual top → bottom: [day1 sep, day1 msgs..., day2 sep, day2 msgs...]
  // DOM: [dayN últ msg, ..., dayN 1ª msg, dayN sep, ..., day1 últ msg, ..., day1 1ª msg, day1 sep]
  const out: GroupedItem[] = []
  for (let i = days.length - 1; i >= 0; i--) {
    const g = days[i]!
    for (let j = g.msgs.length - 1; j >= 0; j--) {
      const m = g.msgs[j]!
      out.push({ type: 'msg', key: `m-${m.id}`, message: m })
    }
    out.push({ type: 'day', key: `d-${g.key}`, label: g.label })
  }
  return out
})
</script>

<template>
  <div class="flex h-full min-h-0 w-full">
    <!-- LIST COLUMN -->
    <div class="flex h-full min-h-0 w-[340px] shrink-0 flex-col">
      <ChatsChatList
        :conversations="conversations ?? []"
        :selected-id="selectedId"
        :pending="convPending"
        :current-user-id="authUser?.id ?? null"
        :current-user-setor-id="currentUserSetorId"
        @select="selectConversation"
      />
    </div>

    <!-- THREAD COLUMN -->
    <div class="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-muted/10">
      <div
        v-if="!selectedConversation"
        class="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground"
      >
        <MessageCircle class="h-12 w-12 text-primary/60" />
        <p class="text-base">Selecione uma conversa</p>
        <p class="text-xs">
          Suas mensagens aparecem aqui, sincronizadas com o WhatsApp.
        </p>
      </div>

      <template v-else>
        <!-- Header -->
        <div class="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-3">
          <Avatar class="h-10 w-10">
            <AvatarImage
              v-if="selectedConversation?.avatar_url || selectedConversation?.leads?.avatar_url"
              :src="(selectedConversation.avatar_url || selectedConversation.leads?.avatar_url) as string"
              :alt="headerName"
            />
            <AvatarFallback
              class="text-sm font-medium"
              :class="isGroupConv ? 'bg-sky-500/15 text-sky-500' : 'bg-muted'"
            >
              <Users v-if="isGroupConv" class="h-5 w-5" />
              <span v-else>{{ headerInitial }}</span>
            </AvatarFallback>
          </Avatar>
          <div class="min-w-0 flex-1">
            <p class="flex items-center gap-1.5 truncate text-sm font-semibold">
              <Users v-if="isGroupConv" class="h-3.5 w-3.5 shrink-0 text-sky-500" />
              <span class="truncate">{{ headerName }}</span>
              <span
                v-if="assignedBadgeLabel"
                class="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-600"
                :title="isAssignedToMe ? 'Você está atendendo' : 'Atribuída a outro atendente'"
              >
                {{ isAssignedToMe ? 'Minha' : assignedBadgeLabel }}
              </span>
              <span
                v-if="setorBadge"
                class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                :style="{
                  backgroundColor: setorBadge.cor + '20',
                  color: setorBadge.cor,
                }"
                :title="`Setor: ${setorBadge.nome}`"
              >
                {{ setorBadge.nome }}
              </span>
            </p>
            <p
              v-if="presenceLabel"
              class="truncate text-xs italic text-emerald-600"
            >
              {{ presenceLabel }}
            </p>
            <p v-else class="truncate text-xs text-muted-foreground">
              {{ headerNumber }}
            </p>
          </div>
          <Button
            v-if="canClaim"
            variant="default"
            size="sm"
            class="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            :disabled="assigning"
            title="Assumir esta conversa"
            @click="onAssignMe"
          >
            <Loader2 v-if="assigning" class="h-4 w-4 animate-spin" />
            <UserPlus v-else class="h-4 w-4" />
            Assumir
          </Button>
          <Button
            :variant="iaAtiva ? 'default' : 'outline'"
            size="sm"
            :disabled="togglingIa || !selectedConversation?.leads?.id"
            :title="iaAtiva ? 'IA ativa — clique para desativar' : 'IA desativada — clique para ativar'"
            class="gap-1"
            @click="onToggleIa"
          >
            <Loader2 v-if="togglingIa" class="h-4 w-4 animate-spin" />
            <Bot v-else-if="iaAtiva" class="h-4 w-4" />
            <BotOff v-else class="h-4 w-4" />
            <span class="hidden text-xs sm:inline">
              {{ iaAtiva ? 'IA ON' : 'IA OFF' }}
            </span>
          </Button>
          <Button variant="ghost" size="icon" title="Ligar (em breve)" disabled>
            <Phone class="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="icon" title="Mais">
                <MoreVertical class="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-56">
              <DropdownMenuItem
                v-if="!selectedConversation?.assigned_to || !isAssignedToMe"
                :disabled="assigning"
                @select="onAssignMe"
              >
                <UserPlus class="h-4 w-4" />
                Assumir conversa
              </DropdownMenuItem>
              <DropdownMenuItem
                v-if="selectedConversation?.assigned_to"
                :disabled="assigning"
                @select="onAssignRelease"
              >
                <UserIcon class="h-4 w-4" />
                Liberar conversa
              </DropdownMenuItem>
              <DropdownMenuItem @select="openTransfer('user')">
                <ArrowRightLeft class="h-4 w-4" />
                Transferir → atendente
              </DropdownMenuItem>
              <DropdownMenuItem @select="openTransfer('setor')">
                <ArrowRightLeft class="h-4 w-4" />
                Transferir → setor
              </DropdownMenuItem>
              <DropdownMenuSeparator v-if="selectedConversation?.assigned_to || !isAssignedToMe" />
              <template v-if="hasLead">
                <DropdownMenuItem @select="openLeadDrawer">
                  <UserRound class="h-4 w-4" />
                  Dados do lead
                </DropdownMenuItem>
              </template>
              <template v-else>
                <DropdownMenuItem @select="openLinkLead">
                  <Link2 class="h-4 w-4" />
                  Vincular lead
                </DropdownMenuItem>
              </template>
              <DropdownMenuSeparator />
              <DropdownMenuItem @select="onClearMessages">
                <Eraser class="h-4 w-4" />
                Limpar conversa
              </DropdownMenuItem>
              <DropdownMenuItem
                class="text-destructive focus:text-destructive"
                @select="onDeleteConversation"
              >
                <Trash2 class="h-4 w-4" />
                Excluir conversa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <!-- Messages scroll area -->
        <p
          v-if="msgsPending && (!messages || messages.length === 0)"
          class="flex-1 py-8 text-center text-sm text-muted-foreground"
        >
          Carregando mensagens...
        </p>
        <p
          v-else-if="!messages || messages.length === 0"
          class="flex-1 py-8 text-center text-sm text-muted-foreground"
        >
          Nenhuma mensagem ainda. Envie a primeira!
        </p>
        <div v-else class="relative flex min-h-0 flex-1 flex-col">
        <div
          ref="messagesScrollEl"
          class="flex min-h-0 flex-1 flex-col-reverse space-y-2 space-y-reverse overflow-y-auto px-4 py-4"
          @scroll.passive="onMessagesScroll"
        >
          <template v-for="item in groupedMessages" :key="item.key">
            <div
              v-if="item.type === 'day'"
              class="flex justify-center py-2"
            >
              <span
                class="rounded-md bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm"
              >
                {{ item.label }}
              </span>
            </div>
            <ChatsChatMessage
              v-else
              :message="item.message"
              :quoted-lookup="
                item.message.quoted_message_id
                  ? messagesByWaId.get(item.message.quoted_message_id) ?? null
                  : null
              "
              @reply="startReply"
            />
          </template>
          <div
            v-if="msgsLoadingOlder"
            class="flex justify-center py-2 text-xs text-muted-foreground"
          >
            Carregando mensagens anteriores...
          </div>
          <div
            v-else-if="!msgsHasMore && messages && messages.length >= 20"
            class="flex justify-center py-2 text-[10px] uppercase tracking-wide text-muted-foreground/60"
          >
            início da conversa
          </div>
        </div>
        <button
          v-if="showJumpButton"
          type="button"
          class="absolute bottom-4 right-4 z-10 flex h-10 items-center gap-1.5 rounded-full bg-emerald-600 px-3 text-white shadow-lg transition hover:bg-emerald-500"
          title="Ir para mensagens mais recentes"
          @click="scrollToLatest"
        >
          <ChevronDown class="h-5 w-5" />
          <span
            v-if="newMessagesCount > 0"
            class="rounded-full bg-white/25 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
          >
            {{ newMessagesCount > 99 ? '99+' : newMessagesCount }}
          </span>
        </button>
        </div>

        <p
          v-if="errorMsg"
          class="mx-4 mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {{ errorMsg }}
        </p>

        <!-- Input -->
        <div
          class="shrink-0 border-t p-3"
          :class="inputMode === 'note' ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-background'"
        >
          <div class="mb-2 flex gap-1 text-xs">
            <button
              type="button"
              class="rounded px-2 py-1 font-medium transition-colors"
              :class="inputMode === 'message' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/60'"
              @click="inputMode = 'message'"
            >
              Mensagem
            </button>
            <button
              type="button"
              class="rounded px-2 py-1 font-medium transition-colors"
              :class="inputMode === 'note' ? 'bg-amber-500 text-white' : 'text-muted-foreground hover:bg-muted/60'"
              title="Visível só para equipe — não envia WhatsApp"
              @click="inputMode = 'note'"
            >
              Nota interna
            </button>
          </div>
          <div
            v-if="replyingTo && inputMode === 'message'"
            class="mb-2 flex items-start gap-2 rounded-md border-l-4 border-emerald-500 bg-muted/50 px-3 py-2 text-xs"
          >
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-emerald-600">Respondendo a {{ replyPreview.sender }}</p>
              <p class="truncate text-muted-foreground">{{ replyPreview.text }}</p>
            </div>
            <button
              type="button"
              class="rounded p-1 hover:bg-accent"
              title="Cancelar resposta"
              @click="cancelReply"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
          <div class="flex items-end gap-2">
            <ChatsEmojiPicker @pick="insertEmoji" />
            <Popover v-model:open="attachMenuOpen">
              <PopoverTrigger as-child>
                <Button variant="ghost" size="icon" title="Anexar">
                  <Paperclip class="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" class="w-56 p-1">
                <button
                  type="button"
                  class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
                  @click="openAttachment('media')"
                >
                  <ImageIcon class="h-4 w-4 text-violet-500" />
                  Mídia (foto/vídeo/arquivo)
                </button>
                <button
                  type="button"
                  class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
                  @click="openAttachment('link')"
                >
                  <LinkIcon class="h-4 w-4 text-sky-500" />
                  Link
                </button>
                <button
                  type="button"
                  class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
                  @click="openAttachment('location')"
                >
                  <MapPin class="h-4 w-4 text-emerald-500" />
                  Localização
                </button>
                <button
                  type="button"
                  class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
                  @click="openAttachment('contact')"
                >
                  <UserIcon class="h-4 w-4 text-amber-500" />
                  Contato
                </button>
                <button
                  type="button"
                  class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
                  @click="openAttachment('poll')"
                >
                  <BarChart3 class="h-4 w-4 text-pink-500" />
                  Enquete
                </button>
              </PopoverContent>
            </Popover>
            <div class="relative flex-1">
              <div
                v-if="mentionOpen"
                class="absolute bottom-full left-0 z-20 mb-1 max-h-64 w-72 overflow-y-auto rounded-md border bg-popover p-1 text-sm shadow-md"
              >
                <button
                  v-for="(opt, i) in mentionResults"
                  :key="opt.jid"
                  type="button"
                  class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left"
                  :class="i === mentionIndex ? 'bg-accent' : 'hover:bg-accent/60'"
                  @mousedown.prevent="applyMention(opt)"
                  @mouseenter="mentionIndex = i"
                >
                  <span class="truncate font-medium">{{ opt.name }}</span>
                  <span class="ml-auto truncate text-[11px] text-muted-foreground">{{ opt.digits }}</span>
                </button>
              </div>
              <textarea
                ref="inputEl"
                v-model="input"
                rows="1"
                :placeholder="inputMode === 'note' ? 'Nota interna (só equipe vê)' : 'Digite uma mensagem'"
                class="min-h-[40px] w-full resize-none overflow-hidden rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                :class="inputMode === 'note' ? 'border-amber-400' : ''"
                @keydown="handleKeydown"
                @keyup="detectMention"
                @click="detectMention"
                @input="detectMention"
                @blur="mentionQuery = null"
              />
            </div>
            <ChatsAudioRecorder
              v-if="!input.trim() && inputMode === 'message'"
              @sent="errorMsg = ''"
            />
            <Button
              v-else
              size="icon"
              :disabled="sending"
              title="Enviar"
              @click="send"
            >
              <Loader2 v-if="sending" class="h-4 w-4 animate-spin" />
              <Send v-else class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </template>
    </div>

    <LeadsLeadDrawer
      v-model:open="drawerOpen"
      :lead="leadForDialog"
      :columns="columns ?? []"
    />

    <ChatsSendMediaDialog
      v-model:open="mediaOpen"
      @submit="(p) => onSendRich('media', p)"
    />
    <ChatsSendLinkDialog
      v-model:open="linkOpen"
      @submit="(p) => onSendRich('link', p)"
    />
    <ChatsSendLocationDialog
      v-model:open="locationOpen"
      @submit="(p) => onSendRich('location', p)"
    />
    <ChatsSendContactDialog
      v-model:open="contactOpen"
      @submit="(p) => onSendRich('contact', p)"
    />
    <ChatsSendPollDialog
      v-model:open="pollOpen"
      @submit="(p) => onSendRich('poll', p)"
    />

    <ChatsLinkLeadDialog
      v-model:open="linkLeadOpen"
      :conversation-id="selectedConversation?.id ?? null"
      :default-number="selectedConversation?.leads?.numero_whatsapp_lead ?? selectedConversation?.remoteJid ?? null"
      :default-name="selectedConversation?.leads?.nome_lead ?? null"
      @linked="refreshConversations"
    />

    <ChatsTransferDialog
      v-model:open="transferOpen"
      :company-id="companyId"
      :exclude-user-id="authUser?.id ?? null"
      :initial-mode="transferMode"
      @submit-user="onTransferUser"
      @submit-setor="onTransferSetor"
    />
  </div>
</template>
