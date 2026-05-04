<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search, Users } from 'lucide-vue-next'

type Conv = {
  id: number
  remoteJid: string | null
  leads: {
    id: number
    nome_lead: string | null
    numero_whatsapp_lead: string | null
    avatar_url?: string | null
  } | null
  created_at: string
  last_message: string | null
  last_message_at: string | null
  last_message_tipo: string | null
  last_message_status: string | null
  unread_count: number
  isgrupo?: boolean
  grupoNome?: string | null
  avatar_url?: string | null
  assigned_to?: string | null
  assigned_nome?: string | null
  setor_id?: string | null
  setor_nome?: string | null
  setor_cor?: string | null
}

const props = defineProps<{
  conversations: Conv[]
  selectedId: number | null
  pending: boolean
  currentUserId?: string | null
  currentUserSetorId?: string | null
}>()

type FilterMode = 'todas' | 'minhas' | 'sem' | 'setor'
const filterMode = ref<FilterMode>('todas')

const emit = defineEmits<{ select: [id: number] }>()

const search = ref('')

const hasSetor = computed(() => !!props.currentUserSetorId)

const filtered = computed(() => {
  const uid = props.currentUserId ?? null
  const mySetor = props.currentUserSetorId ?? null
  return (props.conversations ?? []).filter((c) => {
    if (filterMode.value === 'minhas' && c.assigned_to !== uid) return false
    if (filterMode.value === 'sem' && c.assigned_to) return false
    if (filterMode.value === 'setor') {
      if (!mySetor) return false
      if (c.setor_id !== mySetor) return false
    }
    const q = search.value.trim().toLowerCase()
    if (!q) return true
    const hay = [
      c.grupoNome,
      c.leads?.nome_lead,
      c.leads?.numero_whatsapp_lead,
      c.remoteJid,
      c.setor_nome,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
})

const counts = computed(() => {
  const uid = props.currentUserId ?? null
  const mySetor = props.currentUserSetorId ?? null
  const all = props.conversations ?? []
  return {
    todas: all.length,
    minhas: all.filter((c) => c.assigned_to === uid).length,
    sem: all.filter((c) => !c.assigned_to).length,
    setor: mySetor ? all.filter((c) => c.setor_id === mySetor).length : 0,
  }
})

function initial(name: string | null, fallback: string) {
  const n = name?.trim() || fallback
  return (n[0] ?? '?').toUpperCase()
}

function displayName(c: Conv) {
  if (c.isgrupo) return c.grupoNome?.trim() || 'Grupo'
  return (
    c.leads?.nome_lead?.trim() ||
    c.leads?.numero_whatsapp_lead ||
    c.remoteJid ||
    `#${c.id}`
  )
}

function displayNumber(c: Conv) {
  if (c.isgrupo) return 'Grupo'
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
    if (['image', 'imagem', 'photo', 'picture', 'imagemessage'].includes(tipo)) return '📷 Imagem'
    if (['audio', 'voice', 'ptt', 'audiomessage'].includes(tipo)) return '🎤 Áudio'
    if (['video', 'videomessage'].includes(tipo)) return '🎬 Vídeo'
    if (['document', 'file', 'pdf', 'documentmessage'].includes(tipo)) return '📎 Documento'
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
      <div class="mt-2 flex flex-wrap items-center gap-1 text-xs">
        <button
          type="button"
          class="rounded px-2 py-1 transition-colors"
          :class="filterMode === 'todas' ? 'bg-muted font-semibold' : 'text-muted-foreground hover:bg-muted/50'"
          @click="filterMode = 'todas'"
        >
          Todas ({{ counts.todas }})
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 transition-colors"
          :class="filterMode === 'minhas' ? 'bg-muted font-semibold' : 'text-muted-foreground hover:bg-muted/50'"
          @click="filterMode = 'minhas'"
        >
          Minhas ({{ counts.minhas }})
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 transition-colors"
          :class="filterMode === 'sem' ? 'bg-muted font-semibold' : 'text-muted-foreground hover:bg-muted/50'"
          @click="filterMode = 'sem'"
        >
          Sem atendente ({{ counts.sem }})
        </button>
        <button
          v-if="hasSetor"
          type="button"
          class="rounded px-2 py-1 transition-colors"
          :class="filterMode === 'setor' ? 'bg-muted font-semibold' : 'text-muted-foreground hover:bg-muted/50'"
          @click="filterMode = 'setor'"
        >
          Setor ({{ counts.setor }})
        </button>
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

      <ul v-else>
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
              <AvatarImage
                v-if="c.avatar_url || c.leads?.avatar_url"
                :src="(c.avatar_url || c.leads?.avatar_url) as string"
                :alt="(c.isgrupo ? c.grupoNome : c.leads?.nome_lead) ?? ''"
              />
              <AvatarFallback
                class="text-sm font-medium"
                :class="c.isgrupo ? 'bg-sky-500/15 text-sky-500' : 'bg-muted'"
              >
                <Users v-if="c.isgrupo" class="h-5 w-5" />
                <span v-else>{{ initial(c.leads?.nome_lead ?? null, `#${c.id}`) }}</span>
              </AvatarFallback>
            </Avatar>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <p class="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium">
                  <Users v-if="c.isgrupo" class="h-3.5 w-3.5 shrink-0 text-sky-500" />
                  <span class="truncate">{{ displayName(c) }}</span>
                  <span
                    v-if="c.setor_nome"
                    class="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                    :style="{
                      backgroundColor: (c.setor_cor || '#94a3b8') + '20',
                      color: c.setor_cor || '#475569',
                    }"
                    :title="`Setor: ${c.setor_nome}`"
                  >
                    {{ c.setor_nome }}
                  </span>
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
