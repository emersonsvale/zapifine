<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  Send,
  Paperclip,
  Mic,
  Phone,
  MoreVertical,
  MessageCircle,
  Loader2,
  Bot,
  BotOff,
  Eraser,
  Trash2,
  Eye,
  Pencil,
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
  refreshConversations,
  convPending,
  msgsPending,
  toggleLeadIa,
  togglingIa,
  clearMessages,
  deleteConversation,
} = useChats()

const { leads, columns, refreshLeads } = useLeads()
const { toast, confirm } = useAlerts()

const viewOpen = ref(false)
const editOpen = ref(false)

watch(editOpen, async (open, wasOpen) => {
  if (!open && wasOpen) {
    // Dialog acabou de fechar — lead pode ter sido editado/removido.
    await Promise.all([refreshLeads(), refreshConversations()])
  }
})

const leadForDialog = computed<Lead | null>(() => {
  const leadId = selectedConversation.value?.leads?.id
  if (!leadId) return null
  return leads.value?.find((l) => l.id === leadId) ?? null
})

function openLeadView() {
  if (!leadForDialog.value) {
    toast.info('Esta conversa não está vinculada a um lead.')
    return
  }
  viewOpen.value = true
}

function openLeadEdit() {
  if (!leadForDialog.value) {
    toast.info('Esta conversa não está vinculada a um lead.')
    return
  }
  viewOpen.value = false
  editOpen.value = true
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
  try {
    await sendText(text)
    input.value = ''
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : 'Falha ao enviar mensagem.'
  } finally {
    sending.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

const headerName = computed(() => {
  const c = selectedConversation.value
  if (!c) return ''
  return (
    c.leads?.nome_lead?.trim() ||
    c.leads?.numero_whatsapp_lead ||
    c.remoteJid ||
    `#${c.id}`
  )
})
const headerNumber = computed(
  () =>
    selectedConversation.value?.leads?.numero_whatsapp_lead ??
    selectedConversation.value?.remoteJid ??
    '',
)
const headerInitial = computed(() => {
  const n = headerName.value
  return (n[0] ?? '?').toUpperCase()
})

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
            <AvatarFallback class="bg-muted text-sm font-medium">
              {{ headerInitial }}
            </AvatarFallback>
          </Avatar>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold">{{ headerName }}</p>
            <p class="truncate text-xs text-muted-foreground">
              {{ headerNumber }}
            </p>
          </div>
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
              <DropdownMenuItem @select="openLeadView">
                <Eye class="h-4 w-4" />
                Ver lead
              </DropdownMenuItem>
              <DropdownMenuItem @select="openLeadEdit">
                <Pencil class="h-4 w-4" />
                Editar lead
              </DropdownMenuItem>
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
        <div
          v-else
          class="flex min-h-0 flex-1 flex-col-reverse space-y-2 space-y-reverse overflow-y-auto px-4 py-4"
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
            />
          </template>
        </div>

        <p
          v-if="errorMsg"
          class="mx-4 mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {{ errorMsg }}
        </p>

        <!-- Input -->
        <div class="shrink-0 border-t bg-background p-3">
          <div class="flex items-end gap-2">
            <ChatsEmojiPicker @pick="insertEmoji" />
            <Button variant="ghost" size="icon" title="Anexar (em breve)" disabled>
              <Paperclip class="h-4 w-4" />
            </Button>
            <textarea
              ref="inputEl"
              v-model="input"
              rows="1"
              placeholder="Digite uma mensagem"
              class="max-h-40 min-h-[40px] flex-1 resize-none rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              @keydown="handleKeydown"
            />
            <Button
              v-if="!input.trim()"
              variant="ghost"
              size="icon"
              title="Áudio (em breve)"
              disabled
            >
              <Mic class="h-4 w-4" />
            </Button>
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

    <ChatsLeadViewDialog
      v-model:open="viewOpen"
      :lead="leadForDialog"
      @edit="openLeadEdit"
    />
    <LeadsEditLeadDialog
      v-model:open="editOpen"
      :lead="leadForDialog"
      :columns="columns ?? []"
    />
  </div>
</template>
