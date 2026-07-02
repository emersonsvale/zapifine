<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
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
} from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Lead = Database['public']['Tables']['leads']['Row']
type Column = Database['public']['Tables']['ff_colunas_funil']['Row']
type FieldKey =
  | 'nome_lead'
  | 'email'
  | 'numero_whatsapp_lead'
  | 'telefone_secundario'
  | 'cpf'
  | 'data_nascimento'
  | 'genero'
  | 'canal_preferido'
  | 'empresa'
  | 'cargo'
  | 'cnpj'
  | 'cep'
  | 'rua'
  | 'numero_endereco'
  | 'complemento'
  | 'bairro'
  | 'cidade'
  | 'estado'
  | 'coluna_id'
  | 'prioridade'
  | 'origem'
  | 'tags'
  | 'valor_negocio'
  | 'proxima_acao'
  | 'proxima_acao_data'
  | 'resumo_lead'
  | 'observacao'

type FieldState = 'idle' | 'saving' | 'saved' | 'error'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  lead: Lead | null
  columns: Column[]
}>()

const emit = defineEmits<{
  (e: 'deleted', id: number): void
}>()

const { updateLead, deleteLead, toggleIa } = useLeads()
const { toast, confirm } = useAlerts()

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
  tagsText: '',
  valor_negocio: '',
  proxima_acao: '',
  proxima_acao_data: '',
  resumo_lead: '',
  observacao: '',
})

const fieldState = reactive<Record<FieldKey, FieldState>>({} as Record<FieldKey, FieldState>)
const debouncers = new Map<FieldKey, ReturnType<typeof setTimeout>>()
const suppressSave = ref(true)
const togglingIa = ref(false)
const removing = ref(false)
const cepLoading = ref(false)
const activeTab = ref('dados')

function setState(field: FieldKey, state: FieldState) {
  fieldState[field] = state
  if (state === 'saved') {
    setTimeout(() => {
      if (fieldState[field] === 'saved') fieldState[field] = 'idle'
    }, 1500)
  }
}

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

watch(
  () => ({ o: open.value, id: props.lead?.id }),
  ({ o, id }) => {
    if (!o || !props.lead || !id) return
    suppressSave.value = true
    const l = props.lead
    form.nome_lead = l.nome_lead ?? ''
    form.email = (l as unknown as { 'e-mail'?: string | null })['e-mail'] ?? ''
    form.numero_whatsapp_lead = l.numero_whatsapp_lead ?? ''
    form.telefone_secundario = l.telefone_secundario ?? ''
    form.cpf = l.cpf ?? ''
    form.data_nascimento = toDateInput(l.data_nascimento)
    form.genero = l.genero ?? ''
    form.canal_preferido = l.canal_preferido ?? ''
    form.empresa = l.empresa ?? ''
    form.cargo = l.cargo ?? ''
    form.cnpj = l.cnpj ?? ''
    form.cep = l.cep ?? ''
    form.rua = l.rua ?? ''
    form.numero_endereco = l.numero_endereco ?? ''
    form.complemento = l.complemento ?? ''
    form.bairro = l.bairro ?? ''
    form.cidade = l.cidade ?? ''
    form.estado = l.estado ?? ''
    form.coluna_id = l.coluna_id ?? null
    form.prioridade = l.prioridade ?? ''
    form.origem = l.origem ?? ''
    form.tagsText = (l.tags ?? []).join(', ')
    form.valor_negocio = l.valor_negocio != null ? String(l.valor_negocio) : ''
    form.proxima_acao = l.proxima_acao ?? ''
    form.proxima_acao_data = toDatetimeLocal(l.proxima_acao_data)
    form.resumo_lead = l.resumo_lead ?? ''
    form.observacao = l.observacao ?? ''
    activeTab.value = 'dados'
    for (const k in fieldState) delete fieldState[k as FieldKey]
    setTimeout(() => { suppressSave.value = false }, 50)
  },
  { immediate: true },
)

async function persist(field: FieldKey, value: unknown) {
  if (!props.lead) return
  setState(field, 'saving')
  try {
    const patch: Record<string, unknown> = {}
    switch (field) {
      case 'email':
        patch.email = value === '' ? null : value
        break
      case 'valor_negocio': {
        const n = value === '' || value == null ? null : Number(value)
        patch.valor_negocio = n == null || Number.isNaN(n) ? null : n
        break
      }
      case 'data_nascimento':
      case 'proxima_acao_data':
        patch[field] = value === '' ? null : (value as string)
        break
      case 'tags':
        patch.tags = value as string[] | null
        break
      case 'coluna_id':
        patch.coluna_id = value === null || value === '' ? null : Number(value)
        break
      default:
        patch[field] = value === '' ? null : value
    }
    await updateLead(props.lead.id, patch)
    setState(field, 'saved')
  } catch (err) {
    setState(field, 'error')
    toast.error(err instanceof Error ? err.message : 'Falha ao salvar.')
  }
}

function schedule<T>(field: FieldKey, value: T, delay = 600) {
  if (suppressSave.value) return
  const existing = debouncers.get(field)
  if (existing) clearTimeout(existing)
  const timer = setTimeout(() => {
    debouncers.delete(field)
    void persist(field, value)
  }, delay)
  debouncers.set(field, timer)
}

watch(() => form.nome_lead, (v) => schedule('nome_lead', v.trim() || null))
watch(() => form.email, (v) => schedule('email', v.trim() || null))
watch(() => form.numero_whatsapp_lead, (v) => schedule('numero_whatsapp_lead', v.replace(/\D/g, '') || null))
watch(() => form.telefone_secundario, (v) => schedule('telefone_secundario', v.trim() || null))
watch(() => form.cpf, (v) => schedule('cpf', v.trim() || null))
watch(() => form.data_nascimento, (v) => schedule('data_nascimento', v || null, 200))
watch(() => form.genero, (v) => schedule('genero', v || null, 100))
watch(() => form.canal_preferido, (v) => schedule('canal_preferido', v || null, 100))
watch(() => form.empresa, (v) => schedule('empresa', v.trim() || null))
watch(() => form.cargo, (v) => schedule('cargo', v.trim() || null))
watch(() => form.cnpj, (v) => schedule('cnpj', v.trim() || null))
watch(() => form.rua, (v) => schedule('rua', v.trim() || null))
watch(() => form.numero_endereco, (v) => schedule('numero_endereco', v.trim() || null))
watch(() => form.complemento, (v) => schedule('complemento', v.trim() || null))
watch(() => form.bairro, (v) => schedule('bairro', v.trim() || null))
watch(() => form.cidade, (v) => schedule('cidade', v.trim() || null))
watch(() => form.estado, (v) => schedule('estado', v.trim() || null))
watch(() => form.coluna_id, (v) => schedule('coluna_id', v, 100))
watch(() => form.prioridade, (v) => schedule('prioridade', v && v !== 'none' ? v : null, 100))
watch(() => form.origem, (v) => schedule('origem', v.trim() || null))
watch(() => form.tagsText, (v) => {
  const list = v.split(',').map((t) => t.trim()).filter(Boolean)
  schedule('tags', list.length ? list : null)
})
watch(() => form.valor_negocio, (v) => schedule('valor_negocio', v))
watch(() => form.proxima_acao, (v) => schedule('proxima_acao', v.trim() || null))
watch(() => form.proxima_acao_data, (v) => schedule('proxima_acao_data', v ? new Date(v).toISOString() : null, 300))
watch(() => form.resumo_lead, (v) => schedule('resumo_lead', v.trim() || null))
watch(() => form.observacao, (v) => schedule('observacao', v.trim() || null))

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
    suppressSave.value = true
    if (data.logradouro) form.rua = data.logradouro
    if (data.bairro) form.bairro = data.bairro
    if (data.localidade) form.cidade = data.localidade
    if (data.uf) form.estado = data.uf
    setTimeout(() => { suppressSave.value = false }, 30)
    if (props.lead) {
      const patch: Record<string, unknown> = { cep: digits }
      if (data.logradouro) patch.rua = data.logradouro
      if (data.bairro) patch.bairro = data.bairro
      if (data.localidade) patch.cidade = data.localidade
      if (data.uf) patch.estado = data.uf
      try {
        await updateLead(props.lead.id, patch)
        setState('cep', 'saved')
      } catch {
        setState('cep', 'error')
      }
    }
  } catch {
    toast.error('Falha ao consultar CEP.')
  } finally {
    cepLoading.value = false
  }
}

watch(() => form.cep, (v) => {
  const digits = v.replace(/\D/g, '')
  schedule('cep', digits || null, 400)
  if (digits.length === 8) void lookupCep()
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
    open.value = false
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

const colunaOptions = computed(() =>
  (props.columns ?? []).slice().sort((a, b) => a.id - b.id),
)

function stateIcon(field: FieldKey) {
  return fieldState[field]
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent side="right" class="p-0 sm:max-w-[600px] flex flex-col">
      <SheetHeader class="border-b px-6 py-4">
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
            <SheetTitle class="truncate text-lg">
              {{ form.nome_lead || 'Lead sem nome' }}
            </SheetTitle>
            <p class="text-xs text-muted-foreground truncate mt-0.5">
              {{ lead?.numero_whatsapp_lead || lead?.remoteJid_lead || '—' }}
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
      </SheetHeader>

      <Tabs v-model="activeTab" class="flex-1 flex flex-col overflow-hidden">
        <TabsList class="mx-6 mt-4 grid grid-cols-5">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="endereco">Endereço</TabsTrigger>
          <TabsTrigger value="negocio">Negócio</TabsTrigger>
          <TabsTrigger value="notas">Notas</TabsTrigger>
        </TabsList>

        <div class="flex-1 overflow-y-auto px-6 py-4">
          <!-- DADOS -->
          <TabsContent value="dados" class="space-y-4 mt-0">
            <FieldRow :state="stateIcon('nome_lead')" label="Nome" :icon="UserIcon">
              <Input v-model="form.nome_lead" placeholder="Nome completo" />
            </FieldRow>
            <FieldRow :state="stateIcon('email')" label="E-mail" :icon="Mail">
              <Input v-model="form.email" type="email" placeholder="email@exemplo.com" />
            </FieldRow>
            <div class="grid grid-cols-2 gap-3">
              <FieldRow :state="stateIcon('numero_whatsapp_lead')" label="WhatsApp" :icon="Phone">
                <Input v-model="form.numero_whatsapp_lead" placeholder="5511..." inputmode="tel" />
              </FieldRow>
              <FieldRow :state="stateIcon('telefone_secundario')" label="Telefone 2" :icon="Phone">
                <Input v-model="form.telefone_secundario" placeholder="Opcional" inputmode="tel" />
              </FieldRow>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <FieldRow :state="stateIcon('cpf')" label="CPF" :icon="IdCard">
                <Input v-model="form.cpf" placeholder="000.000.000-00" />
              </FieldRow>
              <FieldRow :state="stateIcon('data_nascimento')" label="Nascimento" :icon="Calendar">
                <Input v-model="form.data_nascimento" type="date" />
              </FieldRow>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <FieldRow :state="stateIcon('genero')" label="Gênero" :icon="UserIcon">
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
              <FieldRow :state="stateIcon('canal_preferido')" label="Canal preferido" :icon="MessageSquare">
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
          </TabsContent>

          <!-- EMPRESA -->
          <TabsContent value="empresa" class="space-y-4 mt-0">
            <FieldRow :state="stateIcon('empresa')" label="Empresa" :icon="Building2">
              <Input v-model="form.empresa" placeholder="Nome da empresa" />
            </FieldRow>
            <FieldRow :state="stateIcon('cargo')" label="Cargo" :icon="Briefcase">
              <Input v-model="form.cargo" placeholder="Cargo/função" />
            </FieldRow>
            <FieldRow :state="stateIcon('cnpj')" label="CNPJ" :icon="IdCard">
              <Input v-model="form.cnpj" placeholder="00.000.000/0000-00" />
            </FieldRow>
          </TabsContent>

          <!-- ENDEREÇO -->
          <TabsContent value="endereco" class="space-y-4 mt-0">
            <FieldRow :state="stateIcon('cep')" label="CEP" :icon="MapPin">
              <div class="relative">
                <Input v-model="form.cep" placeholder="00000-000" inputmode="numeric" />
                <Loader2 v-if="cepLoading" class="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </FieldRow>
            <div class="grid grid-cols-[1fr,120px] gap-3">
              <FieldRow :state="stateIcon('rua')" label="Rua" :icon="MapPin">
                <Input v-model="form.rua" placeholder="Logradouro" />
              </FieldRow>
              <FieldRow :state="stateIcon('numero_endereco')" label="Número">
                <Input v-model="form.numero_endereco" placeholder="Nº" />
              </FieldRow>
            </div>
            <FieldRow :state="stateIcon('complemento')" label="Complemento">
              <Input v-model="form.complemento" placeholder="Apto, bloco..." />
            </FieldRow>
            <FieldRow :state="stateIcon('bairro')" label="Bairro">
              <Input v-model="form.bairro" placeholder="Bairro" />
            </FieldRow>
            <div class="grid grid-cols-[1fr,120px] gap-3">
              <FieldRow :state="stateIcon('cidade')" label="Cidade">
                <Input v-model="form.cidade" placeholder="Cidade" />
              </FieldRow>
              <FieldRow :state="stateIcon('estado')" label="UF">
                <Input v-model="form.estado" placeholder="UF" maxlength="2" />
              </FieldRow>
            </div>
          </TabsContent>

          <!-- NEGÓCIO -->
          <TabsContent value="negocio" class="space-y-4 mt-0">
            <FieldRow :state="stateIcon('coluna_id')" label="Etapa do funil" :icon="Target">
              <Select
                :model-value="form.coluna_id != null ? String(form.coluna_id) : ''"
                @update:model-value="(v) => (form.coluna_id = v ? Number(v) : null)"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="c in colunaOptions" :key="c.id" :value="String(c.id)">
                    {{ c.nome_coluna }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <div class="grid grid-cols-2 gap-3">
              <FieldRow :state="stateIcon('prioridade')" label="Prioridade" :icon="Target">
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
              <FieldRow :state="stateIcon('origem')" label="Origem" :icon="Target">
                <Input v-model="form.origem" placeholder="Como nos encontrou?" />
              </FieldRow>
            </div>
            <FieldRow :state="stateIcon('tags')" label="Tags" :icon="Tag">
              <Input v-model="form.tagsText" placeholder="tag1, tag2, tag3" />
            </FieldRow>
            <FieldRow :state="stateIcon('valor_negocio')" label="Valor do negócio" :icon="DollarSign">
              <Input v-model="form.valor_negocio" type="number" step="0.01" placeholder="0,00" inputmode="decimal" />
            </FieldRow>
            <FieldRow :state="stateIcon('proxima_acao')" label="Próxima ação" :icon="Target">
              <Input v-model="form.proxima_acao" placeholder="Ex: enviar proposta" />
            </FieldRow>
            <FieldRow :state="stateIcon('proxima_acao_data')" label="Data da próxima ação" :icon="Calendar">
              <Input v-model="form.proxima_acao_data" type="datetime-local" />
            </FieldRow>
          </TabsContent>

          <!-- NOTAS -->
          <TabsContent value="notas" class="space-y-4 mt-0">
            <FieldRow :state="stateIcon('resumo_lead')" label="Resumo (IA)" :icon="Sparkles">
              <textarea
                v-model="form.resumo_lead"
                rows="4"
                class="flex w-full rounded-md border bg-muted/20 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                placeholder="Resumo gerado pela IA..."
              />
            </FieldRow>
            <FieldRow :state="stateIcon('observacao')" label="Observações" :icon="MessageSquare">
              <textarea
                v-model="form.observacao"
                rows="6"
                class="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                placeholder="Anotações internas..."
              />
            </FieldRow>
          </TabsContent>
        </div>
      </Tabs>
    </SheetContent>
  </Sheet>
</template>
