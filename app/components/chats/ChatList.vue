<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Search,
  Users,
  UserCircle2,
  SlidersHorizontal,
  X,
  Check,
  Bot,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
} from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Conv = {
  id: number
  remoteJid: string | null
  leads: {
    id: number
    nome_lead: string | null
    numero_whatsapp_lead: string | null
    avatar_url?: string | null
    ia_ativa?: boolean
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
  provider?: string | null
  funil_nome?: string | null
  coluna_nome?: string | null
}

type Setor = { id: string; nome: string; cor: string | null }
type AppUser = { id: string; nome: string | null; email: string | null }
type GroupFilter = 'todos' | 'individual' | 'grupo'
type IaFilter = 'todos' | 'on' | 'off'
type Period = 'todos' | 'hoje' | '7d' | '30d'

const props = defineProps<{
  conversations: Conv[]
  selectedId: number | null
  pending: boolean
  currentUserId?: string | null
  currentUserSetorId?: string | null
  companyId?: string | null
  tagsByLeadId?: Record<number, string[]>
}>()

const supabase = useSupabaseClient<Database>()

function tagsFor(c: Conv): string[] {
  const id = c.leads?.id
  if (!id) return []
  return props.tagsByLeadId?.[id] ?? []
}

type FilterMode = 'todas' | 'minhas' | 'sem' | 'setor'
const filterMode = ref<FilterMode>('todas')

const emit = defineEmits<{ select: [id: number] }>()

const search = ref('')

const setoresSel = ref<string[]>([])
const usersSel = ref<string[]>([])
const tagsSel = ref<string[]>([])
const grupoFilter = ref<GroupFilter>('todos')
const iaFilter = ref<IaFilter>('todos')
const unreadOnly = ref(false)
const period = ref<Period>('todos')
const filtersOpen = ref(false)
const sortDir = ref<'desc' | 'asc'>('desc')

const hasSetor = computed(() => !!props.currentUserSetorId)

const { data: setores } = useAsyncData<Setor[]>(
  'chatlist-setores',
  async () => {
    if (!props.companyId) return []
    const { data, error } = await supabase
      .from('setores' as never)
      .select('id, nome, cor')
      .eq('company_id', props.companyId)
      .order('nome', { ascending: true })
    if (error) return []
    return (data ?? []) as unknown as Setor[]
  },
  { watch: [() => props.companyId], default: () => [] },
)

const { data: users } = useAsyncData<AppUser[]>(
  'chatlist-users',
  async () => {
    if (!props.companyId) return []
    const { data, error } = await supabase
      .from('users')
      .select('id, nome, email')
      .eq('companie_id', props.companyId)
      .eq('status', 'Ativo')
      .order('nome', { ascending: true, nullsFirst: false })
    if (error) return []
    return (data ?? []) as unknown as AppUser[]
  },
  { watch: [() => props.companyId], default: () => [] },
)

const allTags = computed<string[]>(() => {
  const set = new Set<string>()
  const src = props.tagsByLeadId ?? {}
  for (const arr of Object.values(src)) {
    for (const t of arr) if (t) set.add(t)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

function toggleIn(list: string[], val: string): string[] {
  return list.includes(val) ? list.filter((v) => v !== val) : [...list, val]
}

function clearFilters() {
  setoresSel.value = []
  usersSel.value = []
  tagsSel.value = []
  grupoFilter.value = 'todos'
  iaFilter.value = 'todos'
  unreadOnly.value = false
  period.value = 'todos'
}

const activeFilterCount = computed(() => {
  let n = 0
  n += setoresSel.value.length
  n += usersSel.value.length
  n += tagsSel.value.length
  if (grupoFilter.value !== 'todos') n += 1
  if (iaFilter.value !== 'todos') n += 1
  if (unreadOnly.value) n += 1
  if (period.value !== 'todos') n += 1
  return n
})

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function withinPeriod(iso: string | null): boolean {
  if (period.value === 'todos') return true
  if (!iso) return false
  const now = Date.now()
  const t = new Date(iso).getTime()
  if (period.value === 'hoje') return t >= startOfDay(new Date())
  if (period.value === '7d') return now - t <= 7 * 86400000
  if (period.value === '30d') return now - t <= 30 * 86400000
  return true
}

function setorNameById(id: string): string {
  return setores.value?.find((s) => s.id === id)?.nome ?? id
}
function userNameById(id: string): string {
  const u = users.value?.find((x) => x.id === id)
  return u?.nome ?? u?.email ?? id
}

const filtered = computed(() => {
  const uid = props.currentUserId ?? null
  const mySetor = props.currentUserSetorId ?? null
  const list = (props.conversations ?? []).filter((c) => {
    if (filterMode.value === 'minhas' && c.assigned_to !== uid) return false
    if (filterMode.value === 'sem' && c.assigned_to) return false
    if (filterMode.value === 'setor') {
      if (!mySetor) return false
      if (c.setor_id !== mySetor) return false
    }

    if (setoresSel.value.length) {
      if (!c.setor_id || !setoresSel.value.includes(c.setor_id)) return false
    }
    if (usersSel.value.length) {
      if (!c.assigned_to || !usersSel.value.includes(c.assigned_to)) return false
    }
    if (tagsSel.value.length) {
      const t = tagsFor(c)
      if (!tagsSel.value.some((tag) => t.includes(tag))) return false
    }
    if (grupoFilter.value === 'grupo' && !c.isgrupo) return false
    if (grupoFilter.value === 'individual' && c.isgrupo) return false
    if (iaFilter.value === 'on' && !c.leads?.ia_ativa) return false
    if (iaFilter.value === 'off' && c.leads?.ia_ativa) return false
    if (unreadOnly.value && !(c.unread_count > 0)) return false
    if (!withinPeriod(c.last_message_at ?? c.created_at)) return false

    const q = search.value.trim().toLowerCase()
    if (!q) return true
    const hay = [
      c.grupoNome,
      c.leads?.nome_lead,
      c.leads?.numero_whatsapp_lead,
      c.remoteJid,
      c.setor_nome,
      c.assigned_nome,
      c.funil_nome,
      c.coluna_nome,
      ...tagsFor(c),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
  const sorted = list.slice().sort((a, b) => {
    const ta = new Date(a.last_message_at ?? a.created_at).getTime()
    const tb = new Date(b.last_message_at ?? b.created_at).getTime()
    return sortDir.value === 'desc' ? tb - ta : ta - tb
  })
  return sorted
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

function channelLabel(p: string | null | undefined): string {
  if (!p) return ''
  if (p.startsWith('whatsapp')) return 'WhatsApp'
  if (p === 'instagram') return 'Instagram'
  if (p === 'facebook') return 'Facebook'
  return p
}

function channelColor(p: string | null | undefined): { bg: string; text: string } {
  if (!p) return { bg: '#e2e8f0', text: '#64748b' }
  if (p.startsWith('whatsapp')) return { bg: '#dcfce7', text: '#16a34a' }
  if (p === 'instagram') return { bg: '#fce7f3', text: '#db2777' }
  if (p === 'facebook') return { bg: '#dbeafe', text: '#2563eb' }
  return { bg: '#e2e8f0', text: '#64748b' }
}

const timeFmt = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
})
const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
})
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
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <Search
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            v-model="search"
            placeholder="Buscar conversa"
            class="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          class="shrink-0"
          :title="sortDir === 'desc' ? 'Mais recentes primeiro (clique p/ inverter)' : 'Mais antigas primeiro (clique p/ inverter)'"
          @click="sortDir = sortDir === 'desc' ? 'asc' : 'desc'"
        >
          <ArrowDownWideNarrow v-if="sortDir === 'desc'" class="h-4 w-4" />
          <ArrowUpWideNarrow v-else class="h-4 w-4" />
        </Button>
        <Popover v-model:open="filtersOpen">
          <PopoverTrigger as-child>
            <Button
              variant="outline"
              size="icon"
              class="relative shrink-0"
              title="Filtros avançados"
            >
              <SlidersHorizontal class="h-4 w-4" />
              <span
                v-if="activeFilterCount > 0"
                class="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold leading-none text-white"
              >
                {{ activeFilterCount }}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" class="w-80 p-0">
            <div class="flex items-center justify-between border-b p-3">
              <p class="text-sm font-semibold">Filtros</p>
              <button
                type="button"
                class="text-xs text-muted-foreground hover:text-foreground"
                :disabled="activeFilterCount === 0"
                @click="clearFilters"
              >
                Limpar
              </button>
            </div>

            <div class="max-h-[70vh] space-y-3 overflow-y-auto p-3 text-xs">
              <div>
                <p class="mb-1.5 font-semibold text-muted-foreground">Setor</p>
                <div v-if="!setores || setores.length === 0" class="text-muted-foreground">
                  Nenhum setor.
                </div>
                <div v-else class="flex flex-wrap gap-1">
                  <button
                    v-for="s in setores"
                    :key="s.id"
                    type="button"
                    class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 transition-colors"
                    :class="setoresSel.includes(s.id) ? 'border-transparent text-white' : 'border-border hover:bg-muted/60'"
                    :style="setoresSel.includes(s.id) ? { backgroundColor: s.cor || '#64748b' } : {}"
                    @click="setoresSel = toggleIn(setoresSel, s.id)"
                  >
                    <span
                      class="inline-block h-2 w-2 rounded-full"
                      :style="{ backgroundColor: s.cor || '#94a3b8' }"
                    />
                    {{ s.nome }}
                  </button>
                </div>
              </div>

              <div>
                <p class="mb-1.5 font-semibold text-muted-foreground">Atendente</p>
                <div v-if="!users || users.length === 0" class="text-muted-foreground">
                  Nenhum atendente.
                </div>
                <div v-else class="max-h-40 overflow-y-auto rounded border">
                  <button
                    v-for="u in users"
                    :key="u.id"
                    type="button"
                    class="flex w-full items-center gap-2 border-b px-2 py-1.5 text-left last:border-b-0 hover:bg-muted/50"
                    @click="usersSel = toggleIn(usersSel, u.id)"
                  >
                    <span
                      class="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                      :class="usersSel.includes(u.id) ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border'"
                    >
                      <Check v-if="usersSel.includes(u.id)" class="h-3 w-3" />
                    </span>
                    <span class="truncate">{{ u.nome || u.email }}</span>
                  </button>
                </div>
              </div>

              <div v-if="allTags.length">
                <p class="mb-1.5 font-semibold text-muted-foreground">Tags</p>
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="t in allTags"
                    :key="t"
                    type="button"
                    class="rounded-full border px-2 py-0.5 transition-colors"
                    :class="tagsSel.includes(t) ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border hover:bg-muted/60'"
                    @click="tagsSel = toggleIn(tagsSel, t)"
                  >
                    {{ t }}
                  </button>
                </div>
              </div>

              <div>
                <p class="mb-1.5 font-semibold text-muted-foreground">Tipo</p>
                <div class="flex gap-1">
                  <button
                    v-for="opt in [
                      { v: 'todos', label: 'Todos' },
                      { v: 'individual', label: 'Individual' },
                      { v: 'grupo', label: 'Grupo' },
                    ]"
                    :key="opt.v"
                    type="button"
                    class="flex-1 rounded border px-2 py-1 transition-colors"
                    :class="grupoFilter === opt.v ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border hover:bg-muted/60'"
                    @click="grupoFilter = opt.v as GroupFilter"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <div>
                <p class="mb-1.5 font-semibold text-muted-foreground">IA</p>
                <div class="flex gap-1">
                  <button
                    v-for="opt in [
                      { v: 'todos', label: 'Todas' },
                      { v: 'on', label: 'IA ON' },
                      { v: 'off', label: 'IA OFF' },
                    ]"
                    :key="opt.v"
                    type="button"
                    class="flex-1 rounded border px-2 py-1 transition-colors"
                    :class="iaFilter === opt.v ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border hover:bg-muted/60'"
                    @click="iaFilter = opt.v as IaFilter"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <div>
                <p class="mb-1.5 font-semibold text-muted-foreground">Período (última msg)</p>
                <div class="flex gap-1">
                  <button
                    v-for="opt in [
                      { v: 'todos', label: 'Tudo' },
                      { v: 'hoje', label: 'Hoje' },
                      { v: '7d', label: '7d' },
                      { v: '30d', label: '30d' },
                    ]"
                    :key="opt.v"
                    type="button"
                    class="flex-1 rounded border px-2 py-1 transition-colors"
                    :class="period === opt.v ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border hover:bg-muted/60'"
                    @click="period = opt.v as Period"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <label class="flex cursor-pointer items-center gap-2">
                <input
                  v-model="unreadOnly"
                  type="checkbox"
                  class="h-4 w-4 rounded border-border"
                />
                <span>Somente não lidas</span>
              </label>
            </div>
          </PopoverContent>
        </Popover>
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
      <div
        v-if="activeFilterCount > 0"
        class="mt-2 flex flex-wrap gap-1 text-[11px]"
      >
        <span
          v-for="id in setoresSel"
          :key="`s-${id}`"
          class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"
        >
          Setor: {{ setorNameById(id) }}
          <button type="button" class="hover:text-destructive" @click="setoresSel = setoresSel.filter((x) => x !== id)">
            <X class="h-3 w-3" />
          </button>
        </span>
        <span
          v-for="id in usersSel"
          :key="`u-${id}`"
          class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"
        >
          Atendente: {{ userNameById(id) }}
          <button type="button" class="hover:text-destructive" @click="usersSel = usersSel.filter((x) => x !== id)">
            <X class="h-3 w-3" />
          </button>
        </span>
        <span
          v-for="t in tagsSel"
          :key="`t-${t}`"
          class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"
        >
          Tag: {{ t }}
          <button type="button" class="hover:text-destructive" @click="tagsSel = tagsSel.filter((x) => x !== t)">
            <X class="h-3 w-3" />
          </button>
        </span>
        <span
          v-if="grupoFilter !== 'todos'"
          class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"
        >
          {{ grupoFilter === 'grupo' ? 'Grupo' : 'Individual' }}
          <button type="button" class="hover:text-destructive" @click="grupoFilter = 'todos'">
            <X class="h-3 w-3" />
          </button>
        </span>
        <span
          v-if="iaFilter !== 'todos'"
          class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"
        >
          <Bot class="h-3 w-3" />
          {{ iaFilter === 'on' ? 'ON' : 'OFF' }}
          <button type="button" class="hover:text-destructive" @click="iaFilter = 'todos'">
            <X class="h-3 w-3" />
          </button>
        </span>
        <span
          v-if="unreadOnly"
          class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"
        >
          Não lidas
          <button type="button" class="hover:text-destructive" @click="unreadOnly = false">
            <X class="h-3 w-3" />
          </button>
        </span>
        <span
          v-if="period !== 'todos'"
          class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"
        >
          {{ period === 'hoje' ? 'Hoje' : period === '7d' ? '7 dias' : '30 dias' }}
          <button type="button" class="hover:text-destructive" @click="period = 'todos'">
            <X class="h-3 w-3" />
          </button>
        </span>
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
                    v-if="c.provider"
                    class="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
                    :style="{
                      backgroundColor: channelColor(c.provider).bg,
                      color: channelColor(c.provider).text,
                    }"
                    :title="`Canal: ${channelLabel(c.provider)}`"
                  >
                    {{ channelLabel(c.provider) }}
                  </span>
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
                  <span
                    v-if="c.funil_nome"
                    class="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-violet-500/10 text-violet-600"
                    :title="`Funil: ${c.funil_nome}${c.coluna_nome ? ' → ' + c.coluna_nome : ''}`"
                  >
                    {{ c.funil_nome }}{{ c.coluna_nome ? ' → ' + c.coluna_nome : '' }}
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
              <div
                v-if="c.assigned_nome"
                class="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"
                :title="`Atendente: ${c.assigned_nome}`"
              >
                <UserCircle2 class="h-3 w-3 shrink-0" />
                <span class="truncate">{{ c.assigned_nome }}</span>
              </div>
              <div
                v-if="tagsFor(c).length"
                class="mt-1 flex flex-wrap items-center gap-1"
              >
                <span
                  v-for="t in tagsFor(c).slice(0, 3)"
                  :key="t"
                  class="truncate rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  :title="t"
                >
                  {{ t }}
                </span>
                <span
                  v-if="tagsFor(c).length > 3"
                  class="text-[10px] text-muted-foreground"
                  :title="tagsFor(c).join(', ')"
                >
                  +{{ tagsFor(c).length - 3 }}
                </span>
              </div>
            </div>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
