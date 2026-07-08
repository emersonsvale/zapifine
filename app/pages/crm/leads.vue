<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Search,
  ExternalLink,
  Bot,
  Hand,
  Pencil,
  Trash2,
  Filter,
  X,
} from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Lead = Database['public']['Tables']['leads']['Row']
type Column = Database['public']['Tables']['ff_colunas_funil']['Row']

useHead({ title: 'Gestão de Leads - Zapifine' })

const supabase = useSupabaseClient<Database>()
const { data: currentUser } = useCurrentUser()
const { funis } = useFunis()
const { getOrCreateConversationForLead } = useLeads()
const { toast, confirm } = useAlerts()

const companyId = computed<string | null>(
  () => currentUser.value?.companie_id ?? null,
)

const {
  data: leads,
  pending: leadsPending,
  refresh: refreshLeads,
} = useAsyncData<Lead[]>(
  'crm-leads-all',
  async () => {
    if (!companyId.value) return []
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('companies_id', companyId.value)
      .order('ultima_interacao_lead', { ascending: false, nullsFirst: false })
    if (error) throw error
    return (data as Lead[]) ?? []
  },
  { watch: [companyId], default: () => [] },
)

const {
  data: columns,
  pending: columnsPending,
} = useAsyncData<Column[]>(
  'crm-leads-columns-all',
  async () => {
    if (!companyId.value) return []
    const { data, error } = await supabase
      .from('ff_colunas_funil')
      .select('*')
      .eq('companie_id', companyId.value)
      .order('position', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true })
    if (error) throw error
    return (data as Column[]) ?? []
  },
  { watch: [companyId], default: () => [] },
)

const columnById = computed(() => {
  const m = new Map<number, Column>()
  for (const c of columns.value ?? []) m.set(c.id, c)
  return m
})

const funilById = computed(() => {
  const m = new Map<number, string>()
  for (const f of funis.value ?? []) m.set(f.id, f.nome_funil ?? 'Sem nome')
  return m
})

// Filtros
const search = ref('')
const filterFunil = ref<string>('all')
const filterColumn = ref<string>('all')
const filterIa = ref<'all' | 'ia' | 'manual'>('all')
const filterPrioridade = ref<'all' | 'baixa' | 'media' | 'alta' | 'none'>('all')
const filterTags = ref<string[]>([])
const filterOrigens = ref<string[]>([])
const dateStart = ref('')
const dateEnd = ref('')
const valorMin = ref('')
const valorMax = ref('')
const advancedOpen = ref(false)

// Reset coluna ao mudar funil
watch(filterFunil, () => {
  filterColumn.value = 'all'
})

const columnsForSelectedFunil = computed<Column[]>(() => {
  const all = columns.value ?? []
  if (filterFunil.value === 'all') return all
  const fid = Number(filterFunil.value)
  return all.filter((c) => c.funil_id === fid)
})

const tagSuggestions = computed<string[]>(() => {
  const set = new Set<string>()
  for (const l of leads.value ?? []) {
    const arr = Array.isArray(l.tags) ? l.tags : []
    for (const t of arr) {
      const s = typeof t === 'string' ? t.trim() : ''
      if (s) set.add(s)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
})

const origemOptions = computed<string[]>(() => {
  const set = new Set<string>()
  for (const l of leads.value ?? []) {
    const s = (l.origem ?? '').trim()
    if (s) set.add(s)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
})

function toggleOrigem(v: string) {
  const i = filterOrigens.value.indexOf(v)
  if (i === -1) filterOrigens.value = [...filterOrigens.value, v]
  else filterOrigens.value = filterOrigens.value.filter((x) => x !== v)
}

function clearFilters() {
  search.value = ''
  filterFunil.value = 'all'
  filterColumn.value = 'all'
  filterIa.value = 'all'
  filterPrioridade.value = 'all'
  filterTags.value = []
  filterOrigens.value = []
  dateStart.value = ''
  dateEnd.value = ''
  valorMin.value = ''
  valorMax.value = ''
}

const activeFilterCount = computed(() => {
  let n = 0
  if (filterFunil.value !== 'all') n++
  if (filterColumn.value !== 'all') n++
  if (filterIa.value !== 'all') n++
  if (filterPrioridade.value !== 'all') n++
  if (filterTags.value.length) n++
  if (filterOrigens.value.length) n++
  if (dateStart.value) n++
  if (dateEnd.value) n++
  if (valorMin.value) n++
  if (valorMax.value) n++
  return n
})

function norm(s: string) {
  return s.trim().toLowerCase()
}

const filtered = computed<Lead[]>(() => {
  const term = norm(search.value)
  const colFilter = filterColumn.value
  const funilFilter = filterFunil.value
  const iaFilter = filterIa.value
  const prioFilter = filterPrioridade.value
  const tagsFilter = filterTags.value.map(norm)
  const origemFilter = new Set(filterOrigens.value.map(norm))
  const startMs = dateStart.value ? new Date(dateStart.value).getTime() : null
  const endMs = dateEnd.value ? new Date(dateEnd.value + 'T23:59:59').getTime() : null
  const min = valorMin.value ? Number(valorMin.value) : null
  const max = valorMax.value ? Number(valorMax.value) : null

  return (leads.value ?? []).filter((l) => {
    if (funilFilter !== 'all' && String(l.funil_id) !== funilFilter) return false
    if (colFilter !== 'all' && String(l.coluna_id) !== colFilter) return false
    if (iaFilter === 'ia' && !l.ia_ativa) return false
    if (iaFilter === 'manual' && l.ia_ativa) return false
    if (prioFilter !== 'all') {
      const p = (l.prioridade ?? '').toLowerCase()
      if (prioFilter === 'none') {
        if (p) return false
      } else if (p !== prioFilter) return false
    }
    if (tagsFilter.length) {
      const leadTags = new Set(
        (Array.isArray(l.tags) ? l.tags : [])
          .filter((t): t is string => typeof t === 'string')
          .map(norm),
      )
      for (const t of tagsFilter) if (!leadTags.has(t)) return false
    }
    if (origemFilter.size) {
      if (!origemFilter.has(norm(l.origem ?? ''))) return false
    }
    if (startMs != null || endMs != null) {
      const iso = l.ultima_interacao_lead ?? l.created_at
      const ms = iso ? new Date(iso).getTime() : NaN
      if (Number.isNaN(ms)) return false
      if (startMs != null && ms < startMs) return false
      if (endMs != null && ms > endMs) return false
    }
    if (min != null) {
      if (Number(l.valor_negocio ?? 0) < min) return false
    }
    if (max != null) {
      if (Number(l.valor_negocio ?? 0) > max) return false
    }
    if (!term) return true
    const email = (l as unknown as { 'e-mail'?: string })['e-mail']
    const tagStr = Array.isArray(l.tags) ? l.tags.join(' ') : ''
    const haystack = [
      l.nome_lead,
      l.numero_whatsapp_lead,
      email,
      l.resumo_lead,
      l.observacao,
      l.cidade,
      l.estado,
      l.origem,
      l.empresa,
      l.cpf,
      tagStr,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(term)
  })
})

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
function formatDate(iso: string | null) {
  return iso ? dateFmt.format(new Date(iso)) : '—'
}

const currencyFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})
function formatValor(v: number | string | null | undefined) {
  const n = v == null ? 0 : Number(v)
  if (!n || Number.isNaN(n)) return '—'
  return currencyFmt.format(n)
}

function emailOf(l: Lead) {
  return (l as unknown as { 'e-mail'?: string })['e-mail'] ?? null
}

function leadTagsOf(l: Lead): string[] {
  const t = Array.isArray(l.tags) ? l.tags : []
  return t.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

const totalValor = computed(() =>
  filtered.value.reduce((s, l) => s + (Number(l.valor_negocio ?? 0) || 0), 0),
)

const openingChat = ref<number | null>(null)
const actionError = ref('')

async function openWhatsapp(l: Lead) {
  if (!l.numero_whatsapp_lead) {
    actionError.value = 'Lead sem número de WhatsApp.'
    return
  }
  openingChat.value = l.id
  actionError.value = ''
  try {
    const convId = await getOrCreateConversationForLead(l.id)
    await navigateTo(`/multiatendimento/chats?conv=${convId}`)
  } catch (err) {
    actionError.value =
      err instanceof Error ? err.message : 'Falha ao abrir conversa.'
  } finally {
    openingChat.value = null
  }
}

const editOpen = ref(false)
const editingLead = ref<Lead | null>(null)
function openEdit(l: Lead) {
  editingLead.value = l
  editOpen.value = true
}

// Após fechar drawer, refresh (pode ter mudado funil/coluna/tags)
watch(editOpen, (open, was) => {
  if (!open && was) {
    refreshLeads()
    editingLead.value = null
  }
})

async function handleToggleIa(l: Lead) {
  const next = !l.ia_ativa
  const prev = l.ia_ativa
  l.ia_ativa = next
  const { error } = await supabase
    .from('leads')
    .update({ ia_ativa: next })
    .eq('id', l.id)
  if (error) {
    l.ia_ativa = prev
    toast.error(error.message || 'Falha ao alternar IA.')
  }
}

async function handleDelete(l: Lead) {
  const ok = await confirm({
    title: 'Remover lead',
    description: 'Esta ação não pode ser desfeita.',
    confirmLabel: 'Remover',
    variant: 'danger',
  })
  if (!ok) return
  const { error } = await supabase.from('leads').delete().eq('id', l.id)
  if (error) {
    toast.error(error.message || 'Falha ao remover.')
    return
  }
  toast.success('Lead removido.')
  await refreshLeads()
}

// Colunas passadas ao drawer: filtra pelas do funil do lead editado.
const drawerColumns = computed<Column[]>(() => {
  const l = editingLead.value
  if (!l) return columns.value ?? []
  return (columns.value ?? []).filter((c) => c.funil_id === l.funil_id)
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">Gestão de Leads</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Todos os leads da empresa, em todos os funis.
        </p>
      </div>
      <Button variant="outline" @click="refreshLeads()">
        Atualizar
      </Button>
    </div>

    <p
      v-if="actionError"
      class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {{ actionError }}
    </p>

    <Card>
      <CardHeader>
        <div class="flex flex-wrap items-center gap-3">
          <div class="relative flex-1 min-w-[240px]">
            <Search
              class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              v-model="search"
              placeholder="Buscar nome, número, e-mail, tag, cidade..."
              class="pl-9"
            />
          </div>

          <Select v-model="filterFunil">
            <SelectTrigger class="w-[200px]">
              <SelectValue placeholder="Funil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os funis</SelectItem>
              <SelectItem
                v-for="f in funis ?? []"
                :key="f.id"
                :value="String(f.id)"
              >
                {{ f.nome_funil ?? 'Sem nome' }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="filterColumn">
            <SelectTrigger class="w-[200px]">
              <SelectValue placeholder="Estágio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estágios</SelectItem>
              <SelectItem
                v-for="c in columnsForSelectedFunil"
                :key="c.id"
                :value="String(c.id)"
              >
                {{ c.nome_coluna ?? '—' }}
                <span
                  v-if="filterFunil === 'all' && c.funil_id != null"
                  class="ml-1 text-xs text-muted-foreground"
                >
                  · {{ funilById.get(c.funil_id) ?? '—' }}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          <Popover v-model:open="advancedOpen">
            <PopoverTrigger as-child>
              <Button variant="outline" class="gap-1">
                <Filter class="h-4 w-4" />
                Filtros
                <span
                  v-if="activeFilterCount"
                  class="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground"
                >
                  {{ activeFilterCount }}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" class="w-[380px] space-y-4">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">IA</label>
                <Select v-model="filterIa">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ia">Só IA ativa</SelectItem>
                    <SelectItem value="manual">Só manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">Prioridade</label>
                <Select v-model="filterPrioridade">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="none">Sem prioridade</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">Tags</label>
                <LeadsTagsSelect
                  v-model="filterTags"
                  :suggestions="tagSuggestions"
                  placeholder="Filtrar por tag..."
                />
              </div>

              <div v-if="origemOptions.length" class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">Origem</label>
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="o in origemOptions"
                    :key="o"
                    type="button"
                    class="rounded-full border px-2 py-0.5 text-[11px] transition-colors"
                    :class="
                      filterOrigens.includes(o)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted'
                    "
                    @click="toggleOrigem(o)"
                  >
                    {{ o }}
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-1.5">
                  <label class="text-xs font-medium text-muted-foreground">Interação de</label>
                  <Input v-model="dateStart" type="date" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-xs font-medium text-muted-foreground">até</label>
                  <Input v-model="dateEnd" type="date" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-1.5">
                  <label class="text-xs font-medium text-muted-foreground">Valor min.</label>
                  <Input v-model="valorMin" type="number" step="0.01" inputmode="decimal" placeholder="0,00" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-xs font-medium text-muted-foreground">Valor max.</label>
                  <Input v-model="valorMax" type="number" step="0.01" inputmode="decimal" placeholder="0,00" />
                </div>
              </div>

              <div class="flex items-center justify-between border-t pt-3">
                <Button variant="ghost" size="sm" @click="clearFilters">
                  <X class="h-3.5 w-3.5" />
                  Limpar
                </Button>
                <Button size="sm" @click="advancedOpen = false">Aplicar</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div
          v-if="activeFilterCount"
          class="mt-3 flex flex-wrap items-center gap-1.5"
        >
          <span class="text-[11px] text-muted-foreground">Ativos:</span>
          <span
            v-if="filterFunil !== 'all'"
            class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]"
          >
            Funil: {{ funilById.get(Number(filterFunil)) ?? '—' }}
            <button class="hover:text-destructive" @click="filterFunil = 'all'">
              <X class="h-3 w-3" />
            </button>
          </span>
          <span
            v-if="filterColumn !== 'all'"
            class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]"
          >
            Estágio: {{ columnById.get(Number(filterColumn))?.nome_coluna ?? '—' }}
            <button class="hover:text-destructive" @click="filterColumn = 'all'">
              <X class="h-3 w-3" />
            </button>
          </span>
          <span
            v-if="filterIa !== 'all'"
            class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]"
          >
            {{ filterIa === 'ia' ? 'IA ativa' : 'Manual' }}
            <button class="hover:text-destructive" @click="filterIa = 'all'">
              <X class="h-3 w-3" />
            </button>
          </span>
          <span
            v-if="filterPrioridade !== 'all'"
            class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]"
          >
            Prioridade: {{ filterPrioridade === 'none' ? 'sem' : filterPrioridade }}
            <button class="hover:text-destructive" @click="filterPrioridade = 'all'">
              <X class="h-3 w-3" />
            </button>
          </span>
          <span
            v-for="t in filterTags"
            :key="`ft-${t}`"
            class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]"
          >
            #{{ t }}
            <button class="hover:text-destructive" @click="filterTags = filterTags.filter((x) => x !== t)">
              <X class="h-3 w-3" />
            </button>
          </span>
          <span
            v-for="o in filterOrigens"
            :key="`fo-${o}`"
            class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]"
          >
            Origem: {{ o }}
            <button class="hover:text-destructive" @click="toggleOrigem(o)">
              <X class="h-3 w-3" />
            </button>
          </span>
          <button
            class="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
            @click="clearFilters"
          >
            Limpar tudo
          </button>
        </div>
      </CardHeader>

      <CardContent>
        <div class="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Funil</TableHead>
                <TableHead>Estágio</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>IA</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Última interação</TableHead>
                <TableHead class="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="leadsPending || columnsPending">
                <TableCell colspan="9" class="h-20 text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
              <TableRow v-else-if="filtered.length === 0">
                <TableCell colspan="9" class="h-20 text-center text-muted-foreground">
                  Nenhum lead encontrado.
                </TableCell>
              </TableRow>
              <TableRow v-for="l in filtered" :key="l.id">
                <TableCell class="font-medium">
                  {{ l.nome_lead || `#${l.id}` }}
                </TableCell>
                <TableCell class="font-mono text-xs">
                  {{ l.numero_whatsapp_lead ?? '—' }}
                </TableCell>
                <TableCell class="text-muted-foreground">
                  {{ l.funil_id ? funilById.get(l.funil_id) ?? '—' : '—' }}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {{ l.coluna_id ? columnById.get(l.coluna_id)?.nome_coluna ?? '—' : '—' }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div class="flex max-w-[200px] flex-wrap gap-1">
                    <span
                      v-for="t in leadTagsOf(l).slice(0, 3)"
                      :key="t"
                      class="rounded-full bg-muted px-2 py-0.5 text-[10px]"
                    >
                      {{ t }}
                    </span>
                    <span
                      v-if="leadTagsOf(l).length > 3"
                      class="text-[10px] text-muted-foreground"
                    >
                      +{{ leadTagsOf(l).length - 3 }}
                    </span>
                    <span
                      v-if="leadTagsOf(l).length === 0"
                      class="text-[10px] text-muted-foreground"
                    >—</span>
                  </div>
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors"
                    :class="
                      l.ia_ativa
                        ? 'bg-primary/15 text-primary hover:bg-primary/25'
                        : 'bg-muted text-muted-foreground hover:bg-muted/60'
                    "
                    @click="handleToggleIa(l)"
                  >
                    <Bot v-if="l.ia_ativa" class="h-3 w-3" />
                    <Hand v-else class="h-3 w-3" />
                    {{ l.ia_ativa ? 'IA' : 'Manual' }}
                  </button>
                </TableCell>
                <TableCell class="text-sm font-medium">
                  {{ formatValor(l.valor_negocio) }}
                </TableCell>
                <TableCell class="text-muted-foreground">
                  {{ formatDate(l.ultima_interacao_lead) }}
                </TableCell>
                <TableCell class="text-right">
                  <div class="inline-flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      @click="openEdit(l)"
                    >
                      <Pencil class="h-4 w-4" />
                    </Button>
                    <Button
                      v-if="l.numero_whatsapp_lead"
                      variant="ghost"
                      size="icon"
                      title="Abrir WhatsApp"
                      :disabled="openingChat === l.id"
                      @click="openWhatsapp(l)"
                    >
                      <ExternalLink class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Remover"
                      class="text-destructive hover:text-destructive"
                      @click="handleDelete(l)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{{ filtered.length }} de {{ leads?.length ?? 0 }} leads.</span>
          <span v-if="totalValor > 0">
            Soma dos valores filtrados:
            <span class="font-semibold text-emerald-500">{{ formatValor(totalValor) }}</span>
          </span>
        </div>
      </CardContent>
    </Card>

    <LeadsLeadDrawer
      v-model:open="editOpen"
      :lead="editingLead"
      :columns="drawerColumns"
    />
  </div>
</template>
