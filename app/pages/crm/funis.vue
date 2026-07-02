<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Plus, Rocket } from 'lucide-vue-next'
import { VueDraggable } from 'vue-draggable-plus'
import type { Database } from '~~/types/database'

type Lead = Database['public']['Tables']['leads']['Row']
type Column = Database['public']['Tables']['ff_colunas_funil']['Row']

useHead({ title: 'Funis - Zapifine' })

const supabase = useSupabaseClient<Database>()
const router = useRouter()
const { toast } = useAlerts()

const {
  columns,
  leads,
  moveLead,
  toggleIa,
  refreshLeads,
  funilId,
  leadsPending,
  columnsPending,
} = useLeads()

// reactive container keyed by column id — mutated in place so that
// vue-draggable-plus can reorder without us replacing array references.
const grouped = reactive<Record<number, Lead[]>>({})

function rebuild() {
  const cols = columns.value ?? []
  const ls = leads.value ?? []
  const seen = new Set<number>()
  for (const col of cols) {
    seen.add(col.id)
    if (!grouped[col.id]) grouped[col.id] = []
    else grouped[col.id]!.splice(0, grouped[col.id]!.length)
  }
  for (const key of Object.keys(grouped)) {
    const k = Number(key)
    if (!seen.has(k)) delete grouped[k]
  }
  for (const lead of ls) {
    const cid = lead.coluna_id
    if (cid != null && grouped[cid]) grouped[cid]!.push(lead)
  }
}

watch([columns, leads], rebuild, { immediate: true })

const errorMsg = ref('')

type SortableAddEvent = {
  newIndex?: number
  oldIndex?: number
  item?: HTMLElement
}

async function onAdd(colId: number, ev: SortableAddEvent) {
  const newIndex = ev.newIndex ?? -1
  const list = grouped[colId]
  const lead = list?.[newIndex]
  if (!lead) return
  try {
    await moveLead(lead.id, colId)
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : 'Falha ao mover o lead.'
    await refreshLeads()
  }
}

async function handleToggleIa(id: number) {
  try {
    await toggleIa(id)
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : 'Falha ao alternar IA.'
  }
}

async function openConversation(lead: Lead) {
  const { data, error } = await supabase
    .from('whats_conversa')
    .select('id')
    .eq('lead_id', lead.id)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    toast.error('Falha ao buscar conversa.')
    return
  }
  if (!data) {
    toast.info('Este lead ainda não possui conversa no WhatsApp.')
    return
  }
  router.push(`/multiatendimento/chats?conv=${data.id}`)
}

// Edit Lead dialog
const editOpen = ref(false)
const editLead = ref<Lead | null>(null)

function openEditLead(lead: Lead) {
  editLead.value = lead
  editOpen.value = true
}

watch(editOpen, async (open, wasOpen) => {
  if (!open && wasOpen) {
    await refreshLeads()
    editLead.value = null
  }
})

// Add Lead dialog
const addOpen = ref(false)
const addColumnId = ref<number | null>(null)
const addColumnLabel = ref<string | undefined>()

function openAddLead(col: Column) {
  addColumnId.value = col.id
  addColumnLabel.value = col.nome_coluna ?? undefined
  addOpen.value = true
}

const firstColumn = computed(() => columns.value?.[0] ?? null)
</script>

<template>
  <div class="flex h-full flex-col gap-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">Funis</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Arraste os cards entre colunas para mudar o estágio.
        </p>
      </div>
      <Button
        v-if="firstColumn"
        @click="openAddLead(firstColumn)"
      >
        <Plus class="h-4 w-4" />
        Novo Lead
      </Button>
    </div>

    <p
      v-if="errorMsg"
      class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      role="alert"
    >
      {{ errorMsg }}
    </p>

    <Card
      v-if="!funilId && !columnsPending"
      class="flex flex-col items-center gap-3 py-16 text-center"
    >
      <Rocket class="h-12 w-12 text-primary" />
      <div>
        <p class="text-lg font-semibold">Funil não configurado</p>
        <p class="mt-1 text-sm text-muted-foreground">
          Configure um funil inicial em
          <span class="font-medium">Configurações &gt; Empresa</span> para
          começar a gerenciar leads.
        </p>
      </div>
    </Card>

    <div
      v-else-if="columnsPending || leadsPending"
      class="flex h-80 items-center justify-center text-sm text-muted-foreground"
    >
      Carregando funil...
    </div>

    <div v-else class="flex-1 overflow-x-auto pb-2">
      <div class="flex h-full min-w-max gap-4">
        <div
          v-for="col in columns ?? []"
          :key="col.id"
          class="flex h-full w-[320px] shrink-0 flex-col rounded-lg border bg-muted/20"
        >
          <div class="flex items-center justify-between border-b px-4 py-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">
                {{ col.nome_coluna ?? 'Sem nome' }}
              </p>
              <p
                v-if="col.descricao"
                class="mt-0.5 truncate text-[11px] text-muted-foreground"
              >
                {{ col.descricao }}
              </p>
            </div>
            <Badge variant="secondary">
              {{ grouped[col.id]?.length ?? 0 }}
            </Badge>
          </div>

          <div class="flex-1 overflow-y-auto px-3 py-3">
            <ClientOnly>
              <VueDraggable
                v-model="grouped[col.id]"
                group="leads"
                :animation="150"
                ghost-class="drag-ghost"
                drag-class="drag-active"
                class="flex min-h-[80px] flex-col gap-2"
                @add="(ev: SortableAddEvent) => onAdd(col.id, ev)"
              >
                <LeadsLeadCard
                  v-for="lead in grouped[col.id] ?? []"
                  :key="lead.id"
                  :lead="lead"
                  @toggle-ia="handleToggleIa"
                  @open-conversation="openConversation"
                  @click="openEditLead"
                />
              </VueDraggable>
            </ClientOnly>

            <p
              v-if="(grouped[col.id]?.length ?? 0) === 0"
              class="mt-2 rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground"
            >
              Solte um card aqui
            </p>
          </div>

          <div class="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              class="w-full justify-center"
              @click="openAddLead(col)"
            >
              <Plus class="h-3.5 w-3.5" />
              Adicionar Lead
            </Button>
          </div>
        </div>
      </div>
    </div>

    <LeadsAddLeadDialog
      v-if="addColumnId != null"
      v-model:open="addOpen"
      :coluna-id="addColumnId"
      :coluna-label="addColumnLabel"
    />

    <LeadsLeadDrawer
      v-model:open="editOpen"
      :lead="editLead"
      :columns="columns ?? []"
    />
  </div>
</template>

<style scoped>
.drag-ghost {
  opacity: 0.4;
}
.drag-active {
  box-shadow: 0 0 0 2px var(--primary);
}
</style>
