<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Search,
  Plus,
  ExternalLink,
  Bot,
  Hand,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Lead = Database['public']['Tables']['leads']['Row']

useHead({ title: 'Gestão de Leads - Zapifine' })

const {
  leads,
  columns,
  toggleIa,
  deleteLead,
  refreshLeads,
  columnsPending,
  leadsPending,
  getOrCreateConversationForLead,
} = useLeads()

const { toast, confirm } = useAlerts()

const search = ref('')
const filterColumn = ref<string>('all')

const columnById = computed(() => {
  const m = new Map<number, string>()
  for (const c of columns.value ?? []) {
    m.set(c.id, c.nome_coluna ?? '—')
  }
  return m
})

const filtered = computed<Lead[]>(() => {
  const term = search.value.trim().toLowerCase()
  const colFilter = filterColumn.value
  return (leads.value ?? []).filter((l) => {
    if (colFilter !== 'all' && String(l.coluna_id) !== colFilter) return false
    if (!term) return true
    const haystack = [
      l.nome_lead,
      l.numero_whatsapp_lead,
      (l as unknown as { 'e-mail'?: string })['e-mail'],
      l.resumo_lead,
      l.cidade,
      l.estado,
      l.origem,
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

function emailOf(l: Lead) {
  return (l as unknown as { 'e-mail'?: string })['e-mail'] ?? null
}

const openingChat = ref<number | null>(null)
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

const actionError = ref('')

const editOpen = ref(false)
const editingLead = ref<Lead | null>(null)
function openEdit(l: Lead) {
  editingLead.value = l
  editOpen.value = true
}

async function handleToggleIa(id: number) {
  try {
    await toggleIa(id)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao alternar IA.')
  }
}

async function handleDelete(id: number) {
  const ok = await confirm({
    title: 'Remover lead',
    description: 'Esta ação não pode ser desfeita.',
    confirmLabel: 'Remover',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await deleteLead(id)
    toast.success('Lead removido.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao remover.')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">Gestão de Leads</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Visualize, filtre e gerencie todos os leads da empresa.
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
              placeholder="Buscar por nome, número, e-mail, cidade..."
              class="pl-9"
            />
          </div>

          <Select v-model="filterColumn">
            <SelectTrigger class="w-[220px]">
              <SelectValue placeholder="Filtrar por coluna" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as colunas</SelectItem>
              <SelectItem
                v-for="c in columns ?? []"
                :key="c.id"
                :value="String(c.id)"
              >
                {{ c.nome_coluna ?? '—' }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div class="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Estágio</TableHead>
                <TableHead>IA</TableHead>
                <TableHead>Última interação</TableHead>
                <TableHead class="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="leadsPending || columnsPending">
                <TableCell colspan="7" class="h-20 text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
              <TableRow v-else-if="filtered.length === 0">
                <TableCell colspan="7" class="h-20 text-center text-muted-foreground">
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
                  {{ emailOf(l) ?? '—' }}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {{ l.coluna_id ? columnById.get(l.coluna_id) ?? '—' : '—' }}
                  </Badge>
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
                    @click="handleToggleIa(l.id)"
                  >
                    <Bot v-if="l.ia_ativa" class="h-3 w-3" />
                    <Hand v-else class="h-3 w-3" />
                    {{ l.ia_ativa ? 'IA' : 'Manual' }}
                  </button>
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
                      @click="openWhatsapp(l)"
                    >
                      <ExternalLink class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Remover"
                      class="text-destructive hover:text-destructive"
                      @click="handleDelete(l.id)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <p class="mt-3 text-xs text-muted-foreground">
          {{ filtered.length }} de {{ leads?.length ?? 0 }} leads.
        </p>
      </CardContent>
    </Card>

    <LeadsEditLeadDialog
      v-model:open="editOpen"
      :lead="editingLead"
      :columns="columns ?? []"
    />
  </div>
</template>
