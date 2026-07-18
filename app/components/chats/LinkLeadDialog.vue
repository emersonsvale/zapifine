<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Loader2, Search, UserPlus, Link as LinkIcon } from 'lucide-vue-next'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  conversationId: number | null
  defaultNumber?: string | null
  defaultName?: string | null
  /** Aba aberta ao abrir o modal. 'new' para ir direto em "Criar novo". */
  initialTab?: 'existing' | 'new'
}>()

const emit = defineEmits<{ linked: [] }>()

const { leads, columns, createLead, refreshLeads } = useLeads()
const { linkLead } = useChats()

const tab = ref<'existing' | 'new'>('existing')
const query = ref('')
const saving = ref(false)
const errorMsg = ref('')

const form = ref({
  nome: '',
  numero: '',
  email: '',
})

watch(open, (v) => {
  if (!v) return
  tab.value = props.initialTab ?? 'existing'
  query.value = ''
  errorMsg.value = ''
  saving.value = false
  form.value = {
    nome: props.defaultName ?? '',
    numero: props.defaultNumber ?? '',
    email: '',
  }
})

const filteredLeads = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = leads.value ?? []
  const sorted = list.slice().sort((a, b) => {
    const na = (a.nome_lead ?? '').toLowerCase()
    const nb = (b.nome_lead ?? '').toLowerCase()
    return na.localeCompare(nb)
  })
  if (!q) return sorted.slice(0, 30)
  return sorted
    .filter(
      (l) =>
        (l.nome_lead ?? '').toLowerCase().includes(q) ||
        (l.numero_whatsapp_lead ?? '').includes(q) ||
        (l['e-mail'] ?? '').toLowerCase().includes(q),
    )
    .slice(0, 30)
})

const initialColumnId = computed(() => columns.value?.[0]?.id ?? null)

async function linkExisting(leadId: number) {
  if (!props.conversationId) return
  errorMsg.value = ''
  saving.value = true
  try {
    await linkLead(props.conversationId, leadId)
    emit('linked')
    open.value = false
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Falha ao vincular.'
  } finally {
    saving.value = false
  }
}

async function createAndLink() {
  if (!props.conversationId) return
  errorMsg.value = ''
  const colId = initialColumnId.value
  if (!colId) {
    errorMsg.value = 'Funil sem coluna configurada.'
    return
  }
  if (!form.value.nome.trim() && !form.value.numero.trim()) {
    errorMsg.value = 'Informe nome ou número.'
    return
  }
  saving.value = true
  try {
    const created = await createLead({
      nome: form.value.nome,
      numero: form.value.numero,
      email: form.value.email || undefined,
      colunaId: colId,
    })
    await linkLead(props.conversationId, created.id)
    await refreshLeads()
    emit('linked')
    open.value = false
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Falha ao criar e vincular.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Vincular lead à conversa</DialogTitle>
        <DialogDescription>
          Escolha um lead existente ou crie um novo para esta conversa.
        </DialogDescription>
      </DialogHeader>

      <Tabs v-model="tab" class="gap-4">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="existing">
            <LinkIcon class="h-4 w-4" />
            Existente
          </TabsTrigger>
          <TabsTrigger value="new">
            <UserPlus class="h-4 w-4" />
            Criar novo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="existing" class="space-y-3">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="query"
              placeholder="Buscar por nome, número ou email"
              class="pl-9"
            />
          </div>
          <div class="max-h-72 space-y-1 overflow-y-auto rounded-md border bg-muted/20 p-1">
            <p
              v-if="filteredLeads.length === 0"
              class="py-6 text-center text-sm text-muted-foreground"
            >
              Nenhum lead encontrado.
            </p>
            <button
              v-for="l in filteredLeads"
              :key="l.id"
              type="button"
              :disabled="saving"
              class="flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              @click="linkExisting(l.id)"
            >
              <span class="font-medium">
                {{ l.nome_lead || 'Sem nome' }}
              </span>
              <span class="text-xs text-muted-foreground">
                {{ l.numero_whatsapp_lead || '—' }}
              </span>
            </button>
          </div>
        </TabsContent>

        <TabsContent value="new" class="space-y-3">
          <div class="space-y-1.5">
            <Label>Nome</Label>
            <Input v-model="form.nome" placeholder="Nome do lead" />
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <div class="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input v-model="form.numero" placeholder="55119..." inputmode="tel" />
            </div>
            <div class="space-y-1.5">
              <Label>E-mail</Label>
              <Input v-model="form.email" type="email" placeholder="opcional" />
            </div>
          </div>
          <Button class="w-full" :disabled="saving" @click="createAndLink">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            <UserPlus v-else class="h-4 w-4" />
            Criar e vincular
          </Button>
        </TabsContent>
      </Tabs>

      <p
        v-if="errorMsg"
        class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {{ errorMsg }}
      </p>

      <DialogFooter>
        <Button variant="outline" :disabled="saving" @click="open = false">Cancelar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
