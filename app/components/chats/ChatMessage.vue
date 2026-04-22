<script setup lang="ts">
import { computed } from 'vue'
import { FileText, Check, CheckCheck } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Message = Database['public']['Tables']['whats_mensagens_conversa']['Row']

const props = defineProps<{ message: Message }>()

const isSent = computed(() => props.message.status === 'Enviada')

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
    class="flex w-full"
    :class="isSent ? 'justify-end' : 'justify-start'"
  >
    <div
      class="relative max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm"
      :class="
        isSent
          ? 'bg-emerald-600/90 text-white'
          : 'bg-card border'
      "
    >
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
    </div>
  </div>
</template>
