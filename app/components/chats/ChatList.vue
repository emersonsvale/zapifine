<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search } from 'lucide-vue-next'

type Conv = {
  id: number
  remoteJid: string | null
  leads: {
    id: number
    nome_lead: string | null
    numero_whatsapp_lead: string | null
  } | null
  created_at: string
  last_message: string | null
  last_message_at: string | null
  last_message_tipo: string | null
  last_message_status: string | null
  unread_count: number
}

const props = defineProps<{
  conversations: Conv[]
  selectedId: number | null
  pending: boolean
}>()

const emit = defineEmits<{ select: [id: number] }>()

const search = ref('')

const filtered = computed(() =>
  (props.conversations ?? []).filter((c) => {
    const q = search.value.trim().toLowerCase()
    if (!q) return true
    const hay = [
      c.leads?.nome_lead,
      c.leads?.numero_whatsapp_lead,
      c.remoteJid,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  }),
)

function initial(name: string | null, fallback: string) {
  const n = name?.trim() || fallback
  return (n[0] ?? '?').toUpperCase()
}

function displayName(c: Conv) {
  return (
    c.leads?.nome_lead?.trim() ||
    c.leads?.numero_whatsapp_lead ||
    c.remoteJid ||
    `#${c.id}`
  )
}

function displayNumber(c: Conv) {
  return c.leads?.numero_whatsapp_lead ?? c.remoteJid ?? ''
}

const timeFmt = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
})
const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
})
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}
function formatListTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Math.round(
    (startOfDay(new Date()) - startOfDay(d)) / 86400000,
  )
  if (diff === 0) return timeFmt.format(d)
  if (diff === 1) return 'Ontem'
  return dateFmt.format(d)
}
function stripWhatsappMarkup(s: string) {
  return s
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/~([^~\n]+)~/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
}
function previewText(c: Conv) {
  const tipo = (c.last_message_tipo ?? '').toLowerCase()
  if (!c.last_message) {
    if (['image', 'imagem', 'photo', 'picture'].includes(tipo)) return '📷 Imagem'
    if (['audio', 'voice', 'ptt'].includes(tipo)) return '🎤 Áudio'
    if (tipo === 'video') return '🎬 Vídeo'
    if (['document', 'file', 'pdf'].includes(tipo)) return '📎 Documento'
    return ''
  }
  return stripWhatsappMarkup(c.last_message)
}
</script>

<template>
  <div class="flex h-full min-h-0 w-full flex-col border-r">
    <div class="shrink-0 border-b p-3">
      <div class="relative">
        <Search
          class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          v-model="search"
          placeholder="Buscar conversa"
          class="pl-9"
        />
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <p
        v-if="pending && filtered.length === 0"
        class="px-4 py-6 text-center text-sm text-muted-foreground"
      >
        Carregando conversas...
      </p>
      <p
        v-else-if="filtered.length === 0"
        class="px-4 py-6 text-center text-sm text-muted-foreground"
      >
        Nenhuma conversa.
      </p>

      <ul>
        <li v-for="c in filtered" :key="c.id">
          <button
            type="button"
            class="flex w-full items-start gap-3 border-b border-border/40 px-3 py-3 text-left transition-colors"
            :class="
              selectedId === c.id
                ? 'bg-muted/60'
                : 'hover:bg-muted/30'
            "
            @click="emit('select', c.id)"
          >
            <Avatar class="h-11 w-11 shrink-0">
              <AvatarFallback class="bg-muted text-sm font-medium">
                {{ initial(c.leads?.nome_lead ?? null, `#${c.id}`) }}
              </AvatarFallback>
            </Avatar>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <p class="truncate text-sm font-medium">
                  {{ displayName(c) }}
                </p>
                <span
                  class="shrink-0 text-[11px]"
                  :class="
                    c.unread_count > 0
                      ? 'font-semibold text-emerald-600'
                      : 'text-muted-foreground'
                  "
                >
                  {{ formatListTime(c.last_message_at ?? c.created_at) }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-2">
                <p
                  class="truncate text-xs"
                  :class="
                    c.unread_count > 0
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  "
                >
                  {{ previewText(c) || displayNumber(c) }}
                </p>
                <span
                  v-if="c.unread_count > 0"
                  class="ml-1 inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-semibold leading-none text-white"
                >
                  {{ c.unread_count > 99 ? '99+' : c.unread_count }}
                </span>
              </div>
            </div>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
