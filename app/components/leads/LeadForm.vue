<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import {
  Loader2,
  Trash2,
  Bot,
  Sparkles,
  User as UserIcon,
  Mail,
  Phone,
  Tag,
  Target,
  MessageSquare,
  Building2,
  Briefcase,
  MapPin,
  Calendar,
  DollarSign,
  IdCard,
  Save,
  ArrowRightLeft,
  ChevronDown,
  CheckCircle2,
} from 'lucide-vue-next'
import type { Database } from '~~/types/database'
import {
  formatPhone,
  maskCPF,
  maskCNPJ,
  maskCEP,
  maskPhoneBR,
  maskMoneyBR,
  formatMoneyBR,
  parseMoneyBR,
} from '~/lib/utils'

type Lead = Database['public']['Tables']['leads']['Row']
type Column = Database['public']['Tables']['ff_colunas_funil']['Row']
type TabId = 'dados' | 'empresa' | 'endereco' | 'negocio' | 'notas'

const props = defineProps<{
  lead: Lead | null
  columns: Column[]
  /** Renderiza fixo numa coluna (sem overlay). Sem isto, é usado dentro de um Sheet. */
  docked?: boolean
}>()

const emit = defineEmits<{
  (e: 'deleted', id: number): void
  (e: 'saved'): void
  /** Pede ao shell para fechar/recolher o painel. */
  (e: 'close'): void
  /** Há campos alterados e não salvos (para o shell avisar antes de descartar). */
  (e: 'dirty', value: boolean): void
  /** Pede ao shell (chat) para abrir o fluxo de transferência da conversa. */
  (e: 'transfer'): void
}>()

const { updateLead, deleteLead, toggleIa, leads: allLeads, moveLead, moveLeadToFunil } = useLeads()
const { funis } = useFunis()
const { toast, confirm } = useAlerts()

const movingFunil = ref(false)
const movingCol = ref(false)

// Nome da coluna/funil atuais do lead (mostrados nos botões do header).
const currentColumnName = computed(() => {
  const id = props.lead?.coluna_id
  if (id == null) return null
  return (props.columns ?? []).find((c) => c.id === id)?.nome_coluna ?? null
})
const currentFunilName = computed(() => {
  const id = props.lead?.funil_id
  if (id == null) return null
  return (funis.value ?? []).find((f) => f.id === id)?.nome_funil ?? null
})

// Opções para os dropdowns do header (excluem a coluna/funil atuais do lead).
const moveColumnOptions = computed(() =>
  (props.columns ?? []).filter((c) => c.id !== props.lead?.coluna_id),
)
const changeFunilOptions = computed(() =>
  (funis.value ?? []).filter((f) => f.id !== props.lead?.funil_id),
)

async function onMoveColumn(colId: number) {
  if (!props.lead || movingCol.value || colId === props.lead.coluna_id) return
  movingCol.value = true
  try {
    await moveLead(props.lead.id, colId)
    const t = (props.columns ?? []).find((c) => c.id === colId)
    toast.success(`Lead movido para "${t?.nome_coluna ?? 'coluna'}".`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao mover lead.')
  } finally {
    movingCol.value = false
  }
}

async function onChangeFunil(v: unknown) {
  if (!v || !props.lead) return
  const targetId = Number(v)
  if (Number.isNaN(targetId) || targetId === props.lead.funil_id) return
  movingFunil.value = true
  try {
    await moveLeadToFunil(props.lead.id, targetId)
    toast.success('Lead movido para outro funil.')
    emit('close')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao mover lead.')
  } finally {
    movingFunil.value = false
  }
}

const tagSuggestions = computed<string[]>(() => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const l of allLeads.value ?? []) {
    const tags = Array.isArray(l.tags) ? l.tags : []
    for (const t of tags) {
      const s = typeof t === 'string' ? t.trim() : ''
      if (!s) continue
      const k = s.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      out.push(s)
    }
  }
  return out.sort((a, b) => a.localeCompare(b))
})

const form = reactive({
  nome_lead: '',
  email: '',
  numero_whatsapp_lead: '',
  telefone_secundario: '',
  cpf: '',
  data_nascimento: '',
  genero: '',
  canal_preferido: '',
  empresa: '',
  cargo: '',
  cnpj: '',
  cep: '',
  rua: '',
  numero_endereco: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  coluna_id: null as number | null,
  prioridade: '',
  origem: '',
  tags: [] as string[],
  valor_negocio: '',
  proxima_acao: '',
  proxima_acao_data: '',
  resumo_lead: '',
  observacao: '',
})

type FormShape = typeof form
const initial = reactive<FormShape>({ ...form })
// Snapshot vazio (form ainda pristino aqui) para limpar quando não há lead.
const pristine: FormShape = JSON.parse(JSON.stringify(form))

function resetForm() {
  Object.assign(form, JSON.parse(JSON.stringify(pristine)))
  Object.assign(initial, JSON.parse(JSON.stringify(pristine)))
}

const savingTab = ref<TabId | null>(null)
const togglingIa = ref(false)
const removing = ref(false)
const cepLoading = ref(false)
const activeTab = ref<TabId>('dados')

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function hydrate(l: Lead) {
  const snap: FormShape = {
    nome_lead: l.nome_lead ?? '',
    email: (l as unknown as { 'e-mail'?: string | null })['e-mail'] ?? '',
    numero_whatsapp_lead: maskPhoneBR(l.numero_whatsapp_lead ?? ''),
    telefone_secundario: maskPhoneBR(l.telefone_secundario ?? ''),
    cpf: maskCPF(l.cpf ?? ''),
    data_nascimento: toDateInput(l.data_nascimento),
    genero: l.genero ?? '',
    canal_preferido: l.canal_preferido ?? '',
    empresa: l.empresa ?? '',
    cargo: l.cargo ?? '',
    cnpj: maskCNPJ(l.cnpj ?? ''),
    cep: maskCEP(l.cep ?? ''),
    rua: l.rua ?? '',
    numero_endereco: l.numero_endereco ?? '',
    complemento: l.complemento ?? '',
    bairro: l.bairro ?? '',
    cidade: l.cidade ?? '',
    estado: l.estado ?? '',
    coluna_id: l.coluna_id ?? null,
    prioridade: l.prioridade ?? '',
    origem: l.origem ?? '',
    tags: Array.isArray(l.tags)
      ? l.tags.filter((t): t is string => typeof t === 'string' && !!t.trim())
      : [],
    valor_negocio: l.valor_negocio == null ? '' : formatMoneyBR(Number(l.valor_negocio)),
    proxima_acao: l.proxima_acao ?? '',
    proxima_acao_data: toDatetimeLocal(l.proxima_acao_data),
    resumo_lead: l.resumo_lead ?? '',
    observacao: l.observacao ?? '',
  }
  Object.assign(form, snap)
  Object.assign(initial, snap)
}

watch(
  () => props.lead?.id,
  () => {
    if (props.lead) hydrate(props.lead)
    else resetForm()
    activeTab.value = 'dados'
  },
  { immediate: true },
)

const tabFields: Record<TabId, (keyof FormShape)[]> = {
  dados: [
    'nome_lead',
    'email',
    'numero_whatsapp_lead',
    'telefone_secundario',
    'cpf',
    'data_nascimento',
    'genero',
    'canal_preferido',
    'tags',
  ],
  empresa: ['empresa', 'cargo', 'cnpj'],
  endereco: ['cep', 'rua', 'numero_endereco', 'complemento', 'bairro', 'cidade', 'estado'],
  negocio: [
    'prioridade',
    'origem',
    'valor_negocio',
    'proxima_acao',
    'proxima_acao_data',
  ],
  notas: ['resumo_lead', 'observacao'],
}

function isDirty(tab: TabId) {
  return tabFields[tab].some((k) => form[k] !== initial[k])
}

const dirtyTabs = computed<Record<TabId, boolean>>(() => ({
  dados: isDirty('dados'),
  empresa: isDirty('empresa'),
  endereco: isDirty('endereco'),
  negocio: isDirty('negocio'),
  notas: isDirty('notas'),
}))

const isAnyDirty = computed(() => Object.values(dirtyTabs.value).some(Boolean))

// Mantém o shell informado do estado "sujo" para poder avisar antes de descartar.
watch(isAnyDirty, (v) => emit('dirty', v), { immediate: true })
onBeforeUnmount(() => emit('dirty', false))

function buildPatchForTab(tab: TabId): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  switch (tab) {
    case 'dados': {
      patch.nome_lead = form.nome_lead.trim() || null
      patch.email = form.email.trim() || null
      patch.numero_whatsapp_lead = form.numero_whatsapp_lead.replace(/\D/g, '') || null
      patch.telefone_secundario = form.telefone_secundario.replace(/\D/g, '') || null
      patch.cpf = form.cpf.replace(/\D/g, '') || null
      patch.data_nascimento = form.data_nascimento || null
      patch.genero = form.genero || null
      patch.canal_preferido = form.canal_preferido || null
      const tagList = form.tags.map((t) => t.trim()).filter(Boolean)
      patch.tags = tagList.length ? tagList : null
      break
    }
    case 'empresa':
      patch.empresa = form.empresa.trim() || null
      patch.cargo = form.cargo.trim() || null
      patch.cnpj = form.cnpj.replace(/\D/g, '') || null
      break
    case 'endereco':
      patch.cep = form.cep.replace(/\D/g, '') || null
      patch.rua = form.rua.trim() || null
      patch.numero_endereco = form.numero_endereco.trim() || null
      patch.complemento = form.complemento.trim() || null
      patch.bairro = form.bairro.trim() || null
      patch.cidade = form.cidade.trim() || null
      patch.estado = form.estado.trim() || null
      break
    case 'negocio': {
      patch.prioridade = form.prioridade && form.prioridade !== 'none' ? form.prioridade : null
      patch.origem = form.origem.trim() || null
      patch.valor_negocio = parseMoneyBR(form.valor_negocio)
      patch.proxima_acao = form.proxima_acao.trim() || null
      patch.proxima_acao_data = form.proxima_acao_data
        ? new Date(form.proxima_acao_data).toISOString()
        : null
      break
    }
    case 'notas':
      patch.resumo_lead = form.resumo_lead.trim() || null
      patch.observacao = form.observacao.trim() || null
      break
  }
  return patch
}

async function saveTab(tab: TabId) {
  if (!props.lead) return
  savingTab.value = tab
  try {
    const patch = buildPatchForTab(tab)
    await updateLead(props.lead.id, patch)
    for (const k of tabFields[tab]) initial[k] = form[k]
    toast.success('Alterações salvas.')
    emit('saved')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao salvar.')
  } finally {
    savingTab.value = null
  }
}

async function lookupCep() {
  const digits = form.cep.replace(/\D/g, '')
  if (digits.length !== 8) return
  cepLoading.value = true
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    const data = (await res.json()) as {
      logradouro?: string
      bairro?: string
      localidade?: string
      uf?: string
      erro?: boolean
    }
    if (data.erro) {
      toast.info('CEP não encontrado.')
      return
    }
    if (data.logradouro) form.rua = data.logradouro
    if (data.bairro) form.bairro = data.bairro
    if (data.localidade) form.cidade = data.localidade
    if (data.uf) form.estado = data.uf
  } catch {
    toast.error('Falha ao consultar CEP.')
  } finally {
    cepLoading.value = false
  }
}

watch(() => form.cep, (v) => {
  const digits = v.replace(/\D/g, '')
  // Só auto-busca em edição do usuário (v difere do hidratado), nunca na hidratação —
  // senão o preenchimento do ViaCEP marcaria o form como "sujo" sem o usuário mexer.
  if (digits.length === 8 && v !== initial.cep) void lookupCep()
})

const iaAtiva = computed(() => !!props.lead?.ia_ativa)

async function handleToggleIa() {
  if (!props.lead) return
  togglingIa.value = true
  try {
    await toggleIa(props.lead.id)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao alternar IA.')
  } finally {
    togglingIa.value = false
  }
}

async function handleDelete() {
  if (!props.lead) return
  const ok = await confirm({
    title: 'Remover lead',
    description: 'Esta ação não pode ser desfeita.',
    confirmLabel: 'Remover',
    variant: 'danger',
  })
  if (!ok) return
  const id = props.lead.id
  removing.value = true
  try {
    await deleteLead(id)
    toast.success('Lead removido.')
    emit('deleted', id)
    emit('close')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao remover.')
  } finally {
    removing.value = false
  }
}

const initials = computed(() => {
  const name = form.nome_lead || props.lead?.nome_lead
  if (!name) return '?'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('') || '?'
})

const phoneDisplay = computed(() => {
  const raw = props.lead?.numero_whatsapp_lead || props.lead?.remoteJid_lead || ''
  return raw ? formatPhone(raw) : '—'
})

</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-background">
    <!-- Título acessível só no modo modal (contexto de Dialog) -->
    <SheetTitle v-if="!docked" class="sr-only">
      {{ form.nome_lead || 'Lead sem nome' }}
    </SheetTitle>
    <SheetDescription v-if="!docked" class="sr-only">
      Editar dados do lead
    </SheetDescription>

    <!-- Header -->
    <div class="border-b" :class="docked ? 'px-4 py-3' : 'px-6 py-4'">
      <div class="flex items-start gap-4">
        <div class="relative shrink-0">
          <img
            v-if="lead?.avatar_url"
            :src="lead.avatar_url"
            class="h-14 w-14 rounded-full object-cover"
            alt=""
          >
          <div
            v-else
            class="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-lg font-semibold"
          >
            {{ initials }}
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <p class="truncate text-lg font-semibold">
            {{ form.nome_lead || 'Lead sem nome' }}
          </p>
          <p class="text-xs text-muted-foreground truncate mt-0.5 font-mono">
            {{ phoneDisplay }}
          </p>
          <div class="flex items-center gap-2 mt-2">
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors"
              :class="iaAtiva ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500' : 'text-muted-foreground'"
              :disabled="togglingIa"
              @click="handleToggleIa"
            >
              <Bot class="h-3 w-3" />
              {{ togglingIa ? '...' : iaAtiva ? 'IA Ativa' : 'IA Inativa' }}
            </button>
            <button
              type="button"
              class="ml-auto inline-flex items-center gap-1 text-xs text-destructive hover:underline"
              :disabled="removing"
              @click="handleDelete"
            >
              <Loader2 v-if="removing" class="h-3 w-3 animate-spin" />
              <Trash2 v-else class="h-3 w-3" />
              Remover
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Ações rápidas: transferir conversa, mover coluna, mudar funil -->
    <div
      v-if="lead"
      class="flex flex-wrap items-center gap-2 border-b py-2"
      :class="docked ? 'px-4' : 'px-6'"
    >
      <Button
        variant="outline"
        size="sm"
        class="h-8 gap-1"
        title="Transferir atendimento"
        @click="emit('transfer')"
      >
        <ArrowRightLeft class="h-3.5 w-3.5" />
        <span class="text-xs">Transferir</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="outline"
            size="sm"
            class="h-8 gap-1"
            :disabled="movingCol || moveColumnOptions.length === 0"
            :title="currentColumnName ? `Coluna: ${currentColumnName}` : 'Mover para outra coluna'"
          >
            <Loader2 v-if="movingCol" class="h-3.5 w-3.5 animate-spin" />
            <CheckCircle2 v-else class="h-3.5 w-3.5 shrink-0" />
            <span class="max-w-[96px] truncate text-xs">{{ currentColumnName ?? 'Coluna' }}</span>
            <ChevronDown class="h-3 w-3 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-52">
          <DropdownMenuLabel>Mover para coluna</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            v-for="col in moveColumnOptions"
            :key="col.id"
            :disabled="movingCol"
            @select="onMoveColumn(col.id)"
          >
            <CheckCircle2 class="h-4 w-4 text-muted-foreground" />
            {{ col.nome_coluna ?? `Coluna ${col.id}` }}
          </DropdownMenuItem>
          <DropdownMenuItem v-if="moveColumnOptions.length === 0" disabled>
            Sem outras colunas
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="outline"
            size="sm"
            class="h-8 gap-1"
            :disabled="movingFunil || changeFunilOptions.length === 0"
            :title="currentFunilName ? `Funil: ${currentFunilName}` : 'Mudar de funil'"
          >
            <Loader2 v-if="movingFunil" class="h-3.5 w-3.5 animate-spin" />
            <Target v-else class="h-3.5 w-3.5 shrink-0" />
            <span class="max-w-[96px] truncate text-xs">{{ currentFunilName ?? 'Funil' }}</span>
            <ChevronDown class="h-3 w-3 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-52">
          <DropdownMenuLabel>Mudar de funil</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            v-for="f in changeFunilOptions"
            :key="f.id"
            :disabled="movingFunil"
            @select="onChangeFunil(f.id)"
          >
            <ArrowRightLeft class="h-4 w-4 text-muted-foreground" />
            {{ f.nome_funil ?? `Funil ${f.id}` }}
          </DropdownMenuItem>
          <DropdownMenuItem v-if="changeFunilOptions.length === 0" disabled>
            Sem outros funis
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <Tabs v-model="activeTab" class="flex-1 flex flex-col overflow-hidden">
      <TabsList
        class="mt-4 grid grid-cols-5"
        :class="docked ? 'mx-4 text-xs' : 'mx-6'"
      >
        <TabsTrigger value="dados">Dados</TabsTrigger>
        <TabsTrigger value="empresa">Empresa</TabsTrigger>
        <TabsTrigger value="endereco">Endereço</TabsTrigger>
        <TabsTrigger value="negocio">Negócio</TabsTrigger>
        <TabsTrigger value="notas">Notas</TabsTrigger>
      </TabsList>

      <div class="flex-1 overflow-y-auto py-4" :class="docked ? 'px-4' : 'px-6'">
        <!-- DADOS -->
        <TabsContent value="dados" class="flex flex-col gap-6 mt-0">
          <FieldRow label="Nome" hint="Nome completo do lead." :icon="UserIcon">
            <Input v-model="form.nome_lead" placeholder="Nome completo" />
          </FieldRow>
          <FieldRow label="E-mail" hint="E-mail principal para contato." :icon="Mail">
            <Input v-model="form.email" type="email" placeholder="email@exemplo.com" inputmode="email" />
          </FieldRow>
          <div class="grid grid-cols-2 gap-4">
            <FieldRow label="WhatsApp" hint="Número de WhatsApp com DDI e DDD. Ex: +55 (11) 90000-0000." :icon="Phone">
              <Input
                :model-value="form.numero_whatsapp_lead"
                placeholder="+55 (11) 90000-0000"
                inputmode="tel"
                @update:model-value="(v) => (form.numero_whatsapp_lead = maskPhoneBR(String(v)))"
              />
            </FieldRow>
            <FieldRow label="Telefone 2" hint="Telefone alternativo (fixo ou celular)." :icon="Phone">
              <Input
                :model-value="form.telefone_secundario"
                placeholder="(11) 0000-0000"
                inputmode="tel"
                @update:model-value="(v) => (form.telefone_secundario = maskPhoneBR(String(v)))"
              />
            </FieldRow>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <FieldRow label="CPF" hint="CPF do lead (pessoa física)." :icon="IdCard">
              <Input
                :model-value="form.cpf"
                placeholder="000.000.000-00"
                inputmode="numeric"
                @update:model-value="(v) => (form.cpf = maskCPF(String(v)))"
              />
            </FieldRow>
            <FieldRow label="Nascimento" hint="Data de nascimento do lead." :icon="Calendar">
              <Input v-model="form.data_nascimento" type="date" />
            </FieldRow>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <FieldRow label="Gênero" hint="Gênero do lead." :icon="UserIcon">
              <Select v-model="form.genero">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                  <SelectItem value="nao_informado">Prefiro não informar</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Canal preferido" hint="Canal preferido do lead para contato." :icon="MessageSquare">
              <Select v-model="form.canal_preferido">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          </div>
          <FieldRow label="Tags" hint="Etiquetas para organizar e filtrar leads." :icon="Tag">
            <LeadsTagsSelect
              v-model="form.tags"
              :suggestions="tagSuggestions"
              placeholder="Adicionar tags..."
            />
          </FieldRow>
          <div class="flex justify-end pt-2">
            <Button
              type="button"
              class="gap-1 bg-emerald-500 text-white hover:bg-emerald-600"
              :disabled="!dirtyTabs.dados || savingTab === 'dados'"
              @click="saveTab('dados')"
            >
              <Loader2 v-if="savingTab === 'dados'" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              {{ savingTab === 'dados' ? 'Salvando...' : 'Salvar' }}
            </Button>
          </div>
        </TabsContent>

        <!-- EMPRESA -->
        <TabsContent value="empresa" class="flex flex-col gap-6 mt-0">
          <FieldRow label="Empresa" hint="Empresa onde o lead trabalha." :icon="Building2">
            <Input v-model="form.empresa" placeholder="Nome da empresa" />
          </FieldRow>
          <FieldRow label="Cargo" hint="Cargo ou função do lead na empresa." :icon="Briefcase">
            <Input v-model="form.cargo" placeholder="Cargo/função" />
          </FieldRow>
          <FieldRow label="CNPJ" hint="CNPJ da empresa (pessoa jurídica)." :icon="IdCard">
            <Input
              :model-value="form.cnpj"
              placeholder="00.000.000/0000-00"
              inputmode="numeric"
              @update:model-value="(v) => (form.cnpj = maskCNPJ(String(v)))"
            />
          </FieldRow>
          <div class="flex justify-end pt-2">
            <Button
              type="button"
              class="gap-1 bg-emerald-500 text-white hover:bg-emerald-600"
              :disabled="!dirtyTabs.empresa || savingTab === 'empresa'"
              @click="saveTab('empresa')"
            >
              <Loader2 v-if="savingTab === 'empresa'" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              {{ savingTab === 'empresa' ? 'Salvando...' : 'Salvar' }}
            </Button>
          </div>
        </TabsContent>

        <!-- ENDEREÇO -->
        <TabsContent value="endereco" class="flex flex-col gap-6 mt-0">
          <FieldRow label="CEP" hint="CEP do endereço — preenche rua, bairro, cidade e UF automaticamente." :icon="MapPin">
            <div class="relative">
              <Input
                :model-value="form.cep"
                placeholder="00000-000"
                inputmode="numeric"
                @update:model-value="(v) => (form.cep = maskCEP(String(v)))"
              />
              <Loader2 v-if="cepLoading" class="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </FieldRow>
          <div class="grid grid-cols-[1fr_110px] gap-4">
            <FieldRow label="Rua" hint="Logradouro (rua, avenida...)." :icon="MapPin">
              <Input v-model="form.rua" placeholder="Logradouro" />
            </FieldRow>
            <FieldRow label="Número" hint="Número do endereço.">
              <Input v-model="form.numero_endereco" placeholder="Nº" inputmode="numeric" />
            </FieldRow>
          </div>
          <FieldRow label="Complemento" hint="Apartamento, bloco, sala, referência...">
            <Input v-model="form.complemento" placeholder="Apto, bloco..." />
          </FieldRow>
          <FieldRow label="Bairro" hint="Bairro do endereço.">
            <Input v-model="form.bairro" placeholder="Bairro" />
          </FieldRow>
          <div class="grid grid-cols-[1fr_90px] gap-4">
            <FieldRow label="Cidade" hint="Cidade do endereço.">
              <Input v-model="form.cidade" placeholder="Cidade" />
            </FieldRow>
            <FieldRow label="UF" hint="Estado (sigla de 2 letras, ex: SP).">
              <Input
                :model-value="form.estado"
                placeholder="UF"
                maxlength="2"
                class="uppercase"
                @update:model-value="(v) => (form.estado = String(v).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))"
              />
            </FieldRow>
          </div>
          <div class="flex justify-end pt-2">
            <Button
              type="button"
              class="gap-1 bg-emerald-500 text-white hover:bg-emerald-600"
              :disabled="!dirtyTabs.endereco || savingTab === 'endereco'"
              @click="saveTab('endereco')"
            >
              <Loader2 v-if="savingTab === 'endereco'" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              {{ savingTab === 'endereco' ? 'Salvando...' : 'Salvar' }}
            </Button>
          </div>
        </TabsContent>

        <!-- NEGÓCIO -->
        <TabsContent value="negocio" class="flex flex-col gap-6 mt-0">
          <div class="grid grid-cols-2 gap-4">
            <FieldRow label="Prioridade" hint="Prioridade do lead no atendimento/funil." :icon="Target">
              <Select v-model="form.prioridade">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Origem" hint="Como o lead chegou até você (indicação, anúncio...)." :icon="Target">
              <Input v-model="form.origem" placeholder="Como nos encontrou?" />
            </FieldRow>
          </div>
          <FieldRow label="Valor do negócio" hint="Valor estimado da oportunidade em reais." :icon="DollarSign">
            <div class="relative">
              <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                :model-value="form.valor_negocio"
                placeholder="0,00"
                inputmode="numeric"
                class="pl-9"
                @update:model-value="(v) => (form.valor_negocio = maskMoneyBR(String(v)))"
              />
            </div>
          </FieldRow>
          <FieldRow label="Próxima ação" hint="Próximo passo com esse lead (ex: enviar proposta)." :icon="Target">
            <Input v-model="form.proxima_acao" placeholder="Ex: enviar proposta" />
          </FieldRow>
          <FieldRow label="Data da próxima ação" hint="Quando executar a próxima ação." :icon="Calendar">
            <Input v-model="form.proxima_acao_data" type="datetime-local" />
          </FieldRow>
          <div class="flex justify-end pt-2">
            <Button
              type="button"
              class="gap-1 bg-emerald-500 text-white hover:bg-emerald-600"
              :disabled="!dirtyTabs.negocio || savingTab === 'negocio'"
              @click="saveTab('negocio')"
            >
              <Loader2 v-if="savingTab === 'negocio'" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              {{ savingTab === 'negocio' ? 'Salvando...' : 'Salvar' }}
            </Button>
          </div>
        </TabsContent>

        <!-- NOTAS -->
        <TabsContent value="notas" class="flex flex-col gap-6 mt-0">
          <FieldRow label="Resumo (IA)" hint="Resumo do lead gerado automaticamente pela IA." :icon="Sparkles">
            <textarea
              v-model="form.resumo_lead"
              rows="4"
              class="flex w-full rounded-md border bg-muted/20 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              placeholder="Resumo gerado pela IA..."
            />
          </FieldRow>
          <FieldRow label="Observações" hint="Anotações internas sobre o lead (não aparecem pro cliente)." :icon="MessageSquare">
            <textarea
              v-model="form.observacao"
              rows="6"
              class="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              placeholder="Anotações internas..."
            />
          </FieldRow>
          <div class="flex justify-end pt-2">
            <Button
              type="button"
              class="gap-1 bg-emerald-500 text-white hover:bg-emerald-600"
              :disabled="!dirtyTabs.notas || savingTab === 'notas'"
              @click="saveTab('notas')"
            >
              <Loader2 v-if="savingTab === 'notas'" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              {{ savingTab === 'notas' ? 'Salvando...' : 'Salvar' }}
            </Button>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  </div>
</template>
