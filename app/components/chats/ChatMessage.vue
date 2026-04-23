<script setup lang="ts">
import { computed, ref } from 'vue'
import { FileText, Check, CheckCheck, SmilePlus } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Message = Database['public']['Tables']['whats_mensagens_conversa']['Row']

const props = defineProps<{ message: Message }>()

const { reactMessage } = useChats()

const reactOpen = ref(false)
const reacting = ref(false)
const reactionQuick = ['👍', '❤️', '😂', '😮', '😢', '🙏']

const isSent = computed(() => props.message.status === 'Enviada')
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
  ['image', 'imagem', 'photo', 'picture'].includes(tipo.value),
)
const isAudio = computed(() =>
  ['audio', 'voice', 'ptt'].includes(tipo.value),
)
const isVideo = computed(() => tipo.value === 'video')
const isDocument = computed(() =>
  ['document', 'file', 'pdf'].includes(tipo.value),
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
    class="group flex w-full items-end gap-1"
    :class="isSent ? 'justify-end' : 'justify-start'"
  >
    <Popover v-if="isSent" v-model:open="reactOpen">
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
      <template v-if="isImage && message.midia_url">
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

      <template v-else>
        <p
          v-if="message.mensagem"
          class="whitespace-pre-wrap break-words"
          v-html="formattedMessage"
        />
        <p v-else class="whitespace-pre-wrap break-words">—</p>
      </template>

      <div
        class="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70"
      >
        <span>{{ formatTime(message.created_at) }}</span>
        <CheckCheck v-if="isSent" class="h-3 w-3" />
        <Check v-else class="h-3 w-3" />
      </div>

      <span
        v-if="currentReaction"
        class="absolute -bottom-3 right-2 rounded-full border bg-background px-1.5 py-0.5 text-xs shadow-sm"
      >
        {{ currentReaction }}
      </span>
    </div>

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
