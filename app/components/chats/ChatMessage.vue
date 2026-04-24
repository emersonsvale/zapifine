<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import {
  FileText,
  Check,
  CheckCheck,
  SmilePlus,
  Pencil,
  Loader2,
  Trash2,
  Ban,
  Reply,
  StickyNote,
} from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Message = Database['public']['Tables']['whats_mensagens_conversa']['Row']

const props = defineProps<{ message: Message; quotedLookup?: Message | null }>()
const emit = defineEmits<{ reply: [message: Message] }>()

const { reactMessage, editMessage, deleteMessage } = useChats()
const { toast, confirm } = useAlerts()

const canReply = computed(() => !!props.message.id_mensagem && !props.message.deletada)
const quotedPreviewText = computed(() => {
  if (!props.quotedLookup) return ''
  const m = props.quotedLookup
  if (m.deletada) return '🚫 Mensagem apagada'
  const tipo = (m.tipo ?? '').toLowerCase()
  if (!m.mensagem) {
    if (['image', 'imagem', 'photo', 'picture'].includes(tipo)) return '📷 Imagem'
    if (['audio', 'voice', 'ptt'].includes(tipo)) return '🎤 Áudio'
    if (tipo === 'video') return '🎬 Vídeo'
    if (['document', 'file', 'pdf'].includes(tipo)) return '📎 Documento'
    return ''
  }
  return m.mensagem.replace(/[*_~`]/g, '').slice(0, 120)
})
const quotedSenderLabel = computed(() => {
  if (!props.quotedLookup) return ''
  return props.quotedLookup.status === 'Recebida' ? 'Lead' : 'Você'
})

const reactOpen = ref(false)
const reacting = ref(false)
const reactionQuick = ['👍', '❤️', '😂', '😮', '😢', '🙏']

const EDIT_WINDOW_MS = 15 * 60 * 1000

const editing = ref(false)
const editText = ref('')
const editPrefix = ref('')
const editTextarea = ref<HTMLTextAreaElement | null>(null)
const editSaving = ref(false)

const SIGNATURE_RE = /^(\*[^*\n]+\*\n\n)([\s\S]*)$/

const isTextLike = computed(() => {
  const t = (props.message.tipo ?? 'text').toLowerCase()
  return t === 'text' || t === 'extendedtextmessage' || t === 'conversation'
})
const withinEditWindow = computed(() => {
  const iso = props.message.created_at
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() < EDIT_WINDOW_MS
})
const canEdit = computed(
  () =>
    !!props.message.id_mensagem &&
    isTextLike.value &&
    withinEditWindow.value,
)

function openEdit() {
  const raw = props.message.mensagem ?? ''
  const m = raw.match(SIGNATURE_RE)
  if (m) {
    editPrefix.value = m[1] ?? ''
    editText.value = m[2] ?? ''
  } else {
    editPrefix.value = ''
    editText.value = raw
  }
  editing.value = true
  nextTick(() => {
    const el = editTextarea.value
    if (el) {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  })
}

function cancelEdit() {
  editing.value = false
  editText.value = ''
  editPrefix.value = ''
}

async function saveEdit() {
  if (editSaving.value) return
  editSaving.value = true
  try {
    const finalText = editPrefix.value + editText.value
    await editMessage(props.message, finalText)
    editing.value = false
    editPrefix.value = ''
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao editar.')
  } finally {
    editSaving.value = false
  }
}

function onEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    cancelEdit()
  } else if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    saveEdit()
  }
}

const deleting = ref(false)
const canDelete = computed(() => !!props.message.id_mensagem && !props.message.deletada)

async function doDelete() {
  if (deleting.value) return
  const ok = await confirm({
    title: 'Apagar mensagem',
    description:
      'A mensagem será apagada para todos no WhatsApp e marcada como removida aqui. Não pode ser desfeito.',
    confirmLabel: 'Apagar',
    variant: 'danger',
  })
  if (!ok) return
  deleting.value = true
  try {
    await deleteMessage(props.message)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao apagar.')
  } finally {
    deleting.value = false
  }
}

const isNote = computed(() => props.message.interna === true)

const SENT_STATUSES = ['Enviada', 'Entregue', 'Lida'] as const
const isSent = computed(() =>
  (SENT_STATUSES as readonly string[]).includes(props.message.status ?? ''),
)
const ackLevel = computed<'sent' | 'delivered' | 'read' | null>(() => {
  const s = props.message.status
  if (s === 'Lida') return 'read'
  if (s === 'Entregue') return 'delivered'
  if (s === 'Enviada') return 'sent'
  return null
})
const groupSender = computed(() => {
  const m = props.message as unknown as {
    ingrupo?: boolean | null
    quemmandou?: string | null
  }
  if (isSent.value) return null
  if (!m.ingrupo) return null
  const raw = m.quemmandou?.trim()
  if (!raw) return null
  const beforeAt = raw.split('@')[0] ?? raw
  const digits = beforeAt.replace(/\D/g, '')
  return digits || beforeAt || null
})

const currentReaction = computed(
  () => (props.message as unknown as { reacao?: string | null }).reacao?.trim() || null,
)
const canReact = computed(
  () => !!(props.message as unknown as { id_mensagem?: string | null }).id_mensagem,
)

async function doReact(emoji: string) {
  if (reacting.value) return
  reactOpen.value = false
  reacting.value = true
  try {
    await reactMessage(props.message, emoji)
  } catch (err) {
    console.warn('[react]', err)
  } finally {
    reacting.value = false
  }
}

const timeFmt = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
})
function formatTime(iso: string | null) {
  return iso ? timeFmt.format(new Date(iso)) : ''
}

const tipo = computed(() => (props.message.tipo ?? 'text').toLowerCase())
const isImage = computed(() =>
  ['image', 'imagem', 'photo', 'picture', 'imagemessage'].includes(tipo.value),
)
const isAudio = computed(() =>
  ['audio', 'voice', 'ptt', 'audiomessage'].includes(tipo.value),
)
const isVideo = computed(() =>
  ['video', 'videomessage'].includes(tipo.value),
)
const isDocument = computed(() =>
  ['document', 'file', 'pdf', 'documentmessage'].includes(tipo.value),
)

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
function renderWhatsappMarkup(raw: string) {
  const escaped = escapeHtml(raw)
  return escaped
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    .replace(/~([^~\n]+)~/g, '<s>$1</s>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
}
const formattedMessage = computed(() =>
  renderWhatsappMarkup(props.message.mensagem ?? ''),
)
</script>

<template>
  <div
    v-if="isNote"
    class="flex w-full justify-center"
  >
    <div
      class="flex max-w-[85%] items-start gap-2 rounded-md border border-amber-300 bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <StickyNote class="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div class="min-w-0 flex-1">
        <p class="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">
          Nota interna
        </p>
        <p class="whitespace-pre-wrap break-words">{{ message.mensagem }}</p>
        <p class="mt-1 text-[10px] opacity-60">{{ formatTime(message.created_at) }}</p>
      </div>
    </div>
  </div>
  <div
    v-else
    class="group flex w-full items-end gap-1"
    :class="isSent ? 'justify-end' : 'justify-start'"
  >
    <template v-if="isSent && !message.deletada">
      <button
        v-if="canReply"
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-full opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100"
        title="Responder"
        @click="emit('reply', message)"
      >
        <Reply class="h-4 w-4 text-muted-foreground" />
      </button>
      <button
        v-if="canEdit"
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-full opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100"
        title="Editar mensagem"
        @click="openEdit"
      >
        <Pencil class="h-4 w-4 text-muted-foreground" />
      </button>
      <button
        v-if="canDelete"
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-full opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        :disabled="deleting"
        title="Apagar para todos"
        @click="doDelete"
      >
        <Loader2 v-if="deleting" class="h-4 w-4 animate-spin text-muted-foreground" />
        <Trash2 v-else class="h-4 w-4 text-muted-foreground" />
      </button>
      <Popover v-model:open="reactOpen">
        <PopoverTrigger as-child>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-full opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100"
            :class="{ 'opacity-100': reactOpen, 'cursor-not-allowed opacity-30': !canReact }"
            :disabled="reacting || !canReact"
            :title="canReact ? 'Reagir' : 'Mensagem sem ID (reagir indisponível)'"
          >
            <SmilePlus class="h-4 w-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent class="flex w-auto gap-1 p-1" side="top">
          <button
            v-for="e in reactionQuick"
            :key="e"
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-md text-lg transition-transform hover:scale-125 hover:bg-accent"
            :class="currentReaction === e ? 'bg-accent' : ''"
            @click="doReact(e)"
          >
            {{ e }}
          </button>
        </PopoverContent>
      </Popover>
    </template>

    <div
      class="relative max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm"
      :class="
        isSent
          ? 'bg-emerald-600/90 text-white'
          : 'bg-card border'
      "
    >
      <p
        v-if="groupSender"
        class="mb-1 text-xs font-semibold text-sky-500"
      >
        {{ groupSender }}
      </p>
      <div
        v-if="message.quoted_message_id && quotedLookup"
        class="mb-1.5 rounded border-l-4 px-2 py-1 text-xs"
        :class="
          isSent
            ? 'border-white/60 bg-white/15'
            : 'border-emerald-500 bg-muted/60'
        "
      >
        <p class="font-semibold" :class="isSent ? 'text-white/90' : 'text-emerald-600'">
          {{ quotedSenderLabel }}
        </p>
        <p class="line-clamp-2 opacity-90">{{ quotedPreviewText }}</p>
      </div>
      <template v-if="message.deletada">
        <p class="flex items-center gap-1.5 italic opacity-80">
          <Ban class="h-3.5 w-3.5" />
          Mensagem apagada
        </p>
      </template>
      <template v-else-if="isImage && message.midia_url">
        <img
          :src="message.midia_url"
          alt="Imagem"
          class="mb-1 max-h-64 max-w-full rounded"
        />
        <p
          v-if="message.mensagem"
          class="whitespace-pre-wrap break-words"
          v-html="formattedMessage"
        />
      </template>

      <template v-else-if="isVideo && message.midia_url">
        <video
          :src="message.midia_url"
          controls
          class="mb-1 max-h-64 max-w-full rounded bg-black"
        />
        <p
          v-if="message.mensagem"
          class="whitespace-pre-wrap break-words"
          v-html="formattedMessage"
        />
      </template>

      <template v-else-if="isAudio && message.midia_url">
        <audio :src="message.midia_url" controls class="max-w-full" />
      </template>

      <template v-else-if="isDocument && message.midia_url">
        <a
          :href="message.midia_url"
          target="_blank"
          rel="noopener"
          class="flex items-center gap-2 underline"
        >
          <FileText class="h-4 w-4" />
          {{ message.mensagem || 'Arquivo' }}
        </a>
      </template>

      <template v-else-if="editing">
        <div
          v-if="editPrefix"
          class="mb-1 whitespace-pre-wrap break-words text-sm opacity-70"
          v-html="renderWhatsappMarkup(editPrefix.trimEnd())"
        />
        <textarea
          ref="editTextarea"
          v-model="editText"
          rows="2"
          class="w-full resize-none rounded border border-white/30 bg-white/15 px-2 py-1 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-white/60"
          :disabled="editSaving"
          @keydown="onEditKeydown"
        />
        <div class="mt-1 flex items-center justify-end gap-2 text-[11px]">
          <button
            type="button"
            class="rounded px-2 py-0.5 hover:bg-white/15"
            :disabled="editSaving"
            @click="cancelEdit"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="flex items-center gap-1 rounded bg-white/25 px-2 py-0.5 font-medium hover:bg-white/35"
            :disabled="editSaving || !editText.trim()"
            @click="saveEdit"
          >
            <Loader2 v-if="editSaving" class="h-3 w-3 animate-spin" />
            Salvar
          </button>
        </div>
      </template>

      <template v-else>
        <p
          v-if="message.mensagem"
          class="whitespace-pre-wrap break-words"
          v-html="formattedMessage"
        />
        <p v-else class="whitespace-pre-wrap break-words">—</p>
      </template>

      <div
        v-if="!editing"
        class="mt-1 flex items-center justify-end gap-1 text-[10px]"
        :class="isSent ? 'opacity-80' : 'opacity-70'"
      >
        <span v-if="message.editada" class="italic">editada</span>
        <span>{{ formatTime(message.created_at) }}</span>
        <Check
          v-if="ackLevel === 'sent'"
          class="h-3 w-3"
        />
        <CheckCheck
          v-else-if="ackLevel === 'delivered'"
          class="h-3 w-3"
        />
        <CheckCheck
          v-else-if="ackLevel === 'read'"
          class="h-3 w-3 text-sky-300"
        />
      </div>

      <span
        v-if="currentReaction"
        class="absolute -bottom-3 right-2 rounded-full border bg-background px-1.5 py-0.5 text-xs shadow-sm"
      >
        {{ currentReaction }}
      </span>
    </div>

    <template v-if="!isSent">
      <button
        v-if="canReply"
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-full opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100"
        title="Responder"
        @click="emit('reply', message)"
      >
        <Reply class="h-4 w-4 text-muted-foreground" />
      </button>
    </template>
    <Popover v-if="!isSent" v-model:open="reactOpen">
      <PopoverTrigger as-child>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-full opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100"
          :class="{ 'opacity-100': reactOpen, 'cursor-not-allowed opacity-30': !canReact }"
          :disabled="reacting || !canReact"
          :title="canReact ? 'Reagir' : 'Mensagem sem ID (reagir indisponível)'"
        >
          <SmilePlus class="h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent class="flex w-auto gap-1 p-1" side="top">
        <button
          v-for="e in reactionQuick"
          :key="e"
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-md text-lg transition-transform hover:scale-125 hover:bg-accent"
          :class="currentReaction === e ? 'bg-accent' : ''"
          @click="doReact(e)"
        >
          {{ e }}
        </button>
      </PopoverContent>
    </Popover>
  </div>
</template>
