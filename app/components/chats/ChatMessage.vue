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
  ArrowRightLeft,
  ZoomIn,
  Download,
  FileClock,
} from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Message = Database['public']['Tables']['whats_mensagens_conversa']['Row']

const props = defineProps<{ message: Message; quotedLookup?: Message | null }>()
const emit = defineEmits<{
  reply: [message: Message]
  'mention-click': [payload: { jid: string; digits: string }]
}>()

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

const isNote = computed(
  () => props.message.interna === true && (props.message.tipo ?? '').toLowerCase() !== 'evento',
)
const isEvento = computed(
  () => (props.message.tipo ?? '').toLowerCase() === 'evento',
)

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
const {
  nameFor: participantNameFor,
  avatarFor: participantAvatarFor,
  map: participantsMap,
} = useParticipants()

const JID_SUFFIXES = ['@s.whatsapp.net', '@c.us', '@lid', '@g.us']

function resolveMention(digits: string): { name: string; jid: string } {
  for (const sfx of JID_SUFFIXES) {
    const jid = digits + sfx
    const row = participantsMap.value[jid]
    if (row?.nome?.trim()) return { name: row.nome.trim(), jid }
  }
  return { name: digits, jid: digits + '@s.whatsapp.net' }
}

const groupSenderJid = computed(() => {
  const m = props.message as unknown as {
    ingrupo?: boolean | null
    quemmandou?: string | null
  }
  if (isSent.value) return null
  if (!m.ingrupo) return null
  const raw = m.quemmandou?.trim()
  return raw || null
})

const groupSender = computed(() => {
  const jid = groupSenderJid.value
  if (!jid) return null
  return participantNameFor(jid) || null
})

const groupSenderAvatar = computed(() => {
  const jid = groupSenderJid.value
  if (!jid) return null
  return participantAvatarFor(jid)
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
  let s = escapeHtml(raw)
  s = s
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    .replace(/~([^~\n]+)~/g, '<s>$1</s>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
  s = s.replace(/@(\d{5,})/g, (_m, digits: string) => {
    const r = resolveMention(digits)
    return `<span class="mention" data-mention-jid="${r.jid}" data-mention-digits="${digits}">@${escapeHtml(r.name)}</span>`
  })
  return s
}

function onMessageClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (!target) return
  const el = target.closest('[data-mention-jid]') as HTMLElement | null
  if (!el) return
  e.stopPropagation()
  const jid = el.dataset.mentionJid ?? ''
  const digits = el.dataset.mentionDigits ?? ''
  if (jid) emit('mention-click', { jid, digits })
}
const formattedMessage = computed(() =>
  renderWhatsappMarkup(props.message.mensagem ?? ''),
)

const lightboxOpen = ref(false)
const lightboxType = computed<'image' | 'video'>(() =>
  isVideo.value ? 'video' : 'image',
)
function openLightbox() {
  if (!props.message.midia_url) return
  lightboxOpen.value = true
}

// ---- Mídia sob demanda (opt-in) + expiração ----
type MediaMeta = {
  midia_pendente?: boolean | null
  midia_expirada?: boolean | null
  midia_nome?: string | null
}
const mediaMeta = computed(() => props.message as unknown as MediaMeta)
const isMediaExpired = computed(() => !!mediaMeta.value.midia_expirada && !props.message.midia_url)
const isMediaPending = computed(
  () => !!mediaMeta.value.midia_pendente && !props.message.midia_url && !isMediaExpired.value,
)
const pendingLabel = computed(() => {
  if (isVideo.value) return '🎬 Vídeo'
  if (isDocument.value) return `📎 ${mediaMeta.value.midia_nome?.trim() || 'Documento'}`
  return '📎 Arquivo'
})

const downloading = ref(false)
async function downloadMedia() {
  if (downloading.value || !props.message.id_mensagem) {
    if (!props.message.id_mensagem) toast.error('Mensagem sem ID — download indisponível.')
    return
  }
  downloading.value = true
  try {
    // O realtime UPDATE troca o card pela mídia assim que a whats-api gravar a URL.
    await $fetch('/api/chats/media/fetch', {
      method: 'POST',
      body: { message_wa_id: props.message.id_mensagem },
    })
  } catch (err) {
    const msg =
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage ??
      (err instanceof Error ? err.message : 'Falha ao baixar a mídia.')
    toast.error(msg)
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <div
    v-if="isEvento"
    class="flex w-full justify-center py-1"
  >
    <div
      class="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-[11px] text-muted-foreground"
    >
      <ArrowRightLeft class="h-3 w-3" />
      <span>{{ message.mensagem }}</span>
      <span class="opacity-60">· {{ formatTime(message.created_at) }}</span>
    </div>
  </div>
  <div
    v-else-if="isNote"
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
      <div
        v-if="groupSender"
        class="mb-1 flex items-center gap-1.5"
      >
        <Avatar v-if="groupSenderAvatar" class="h-5 w-5">
          <AvatarImage :src="groupSenderAvatar" :alt="groupSender" />
          <AvatarFallback class="text-[10px]">{{ groupSender[0]?.toUpperCase() ?? '?' }}</AvatarFallback>
        </Avatar>
        <p class="text-xs font-semibold text-sky-500">{{ groupSender }}</p>
      </div>
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

      <template v-else-if="isMediaExpired">
        <p
          class="flex items-center gap-1.5 text-xs italic"
          :class="isSent ? 'opacity-80' : 'opacity-70'"
        >
          <FileClock class="h-3.5 w-3.5 shrink-0" />
          Arquivo expirado (mais de 3 meses)
        </p>
        <p
          v-if="message.mensagem"
          class="mt-1 whitespace-pre-wrap break-words"
          v-html="formattedMessage"
          @click="onMessageClick"
        />
      </template>

      <template v-else-if="isMediaPending">
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm transition disabled:opacity-60"
          :class="
            isSent
              ? 'border-white/50 hover:bg-white/10'
              : 'border-border hover:bg-accent'
          "
          :disabled="downloading"
          :title="'Baixar arquivo'"
          @click="downloadMedia"
        >
          <Loader2 v-if="downloading" class="h-4 w-4 shrink-0 animate-spin" />
          <Download v-else class="h-4 w-4 shrink-0" />
          <span class="min-w-0 flex-1 truncate text-left">{{ pendingLabel }}</span>
          <span class="shrink-0 text-xs opacity-70">{{ downloading ? 'Baixando…' : 'Baixar' }}</span>
        </button>
        <p
          v-if="message.mensagem"
          class="mt-1 whitespace-pre-wrap break-words"
          v-html="formattedMessage"
          @click="onMessageClick"
        />
      </template>

      <template v-else-if="isImage && message.midia_url">
        <img
          :src="message.midia_url"
          alt="Imagem"
          class="mb-1 max-h-64 max-w-full cursor-zoom-in rounded transition hover:opacity-90"
          @click="openLightbox"
        />
        <p
          v-if="message.mensagem"
          class="whitespace-pre-wrap break-words"
          v-html="formattedMessage"
          @click="onMessageClick"
        />
      </template>

      <template v-else-if="isVideo && message.midia_url">
        <div class="relative mb-1">
          <video
            :src="message.midia_url"
            controls
            class="max-h-64 max-w-full rounded bg-black"
          />
          <button
            type="button"
            class="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-80 transition hover:opacity-100"
            title="Expandir"
            @click.stop="openLightbox"
          >
            <ZoomIn class="h-4 w-4" />
          </button>
        </div>
        <p
          v-if="message.mensagem"
          class="whitespace-pre-wrap break-words"
          v-html="formattedMessage"
          @click="onMessageClick"
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
          @click="onMessageClick"
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

    <ChatsMediaLightbox
      v-if="message.midia_url && (isImage || isVideo)"
      v-model:open="lightboxOpen"
      :src="message.midia_url"
      :type="lightboxType"
    />
  </div>
</template>

<style scoped>
:deep(.mention) {
  font-weight: 600;
  cursor: pointer;
  color: rgb(125 211 252); /* sky-300 */
  text-decoration: none;
}
:deep(.mention:hover) {
  text-decoration: underline;
}
</style>
