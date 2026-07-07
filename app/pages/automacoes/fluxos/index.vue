<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Plus, Workflow, Loader2, Trash2, Pencil } from 'lucide-vue-next'
import type { FlowTriggerType } from '~/composables/useFlows'

useHead({ title: 'Fluxos - Zapifine' })

const { flows, pending, load, create, remove } = useFlows()
const router = useRouter()

const dialogOpen = ref(false)
const submitting = ref(false)
const errorMsg = ref<string | null>(null)

const form = ref<{
  name: string
  trigger_type: FlowTriggerType
}>({
  name: '',
  trigger_type: 'lead_new_message',
})

const TRIGGER_LABELS: Record<FlowTriggerType, string> = {
  lead_new_message: 'Lead novo enviou mensagem',
  lead_archived_message: 'Lead arquivado enviou mensagem',
  lead_in_service_message: 'Lead em atendimento enviou mensagem',
  lead_column_changed: 'Lead mudou de coluna',
  manual_chat: 'Disparo manual do chat',
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Rascunho', cls: 'bg-amber-100 text-amber-800' },
  published: { label: 'Publicado', cls: 'bg-emerald-100 text-emerald-800' },
  archived: { label: 'Arquivado', cls: 'bg-zinc-100 text-zinc-600' },
}

onMounted(() => {
  load().catch((e) => (errorMsg.value = (e as Error).message))
})

async function onCreate() {
  errorMsg.value = null
  submitting.value = true
  try {
    const id = await create({
      name: form.value.name.trim(),
      trigger_type: form.value.trigger_type,
    })
    dialogOpen.value = false
    form.value = { name: '', trigger_type: 'lead_new_message' }
    await router.push(`/automacoes/fluxos/${id}`)
  } catch (e) {
    errorMsg.value = (e as Error).message
  } finally {
    submitting.value = false
  }
}

async function onDelete(id: string, name: string) {
  if (!confirm(`Arquivar fluxo "${name}"?`)) return
  try {
    await remove(id)
  } catch (e) {
    alert((e as Error).message)
  }
}

function goEdit(id: string) {
  router.push(`/automacoes/fluxos/${id}`)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Workflow class="h-7 w-7 text-primary" />
          Fluxos
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Automações visuais: gatilhos, mensagens, condições e ações.
        </p>
      </div>
      <Button @click="dialogOpen = true">
        <Plus class="h-4 w-4" />
        Novo fluxo
      </Button>
    </div>

    <div v-if="errorMsg" class="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
      {{ errorMsg }}
    </div>

    <Card>
      <CardContent class="p-0">
        <div v-if="pending" class="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 class="h-5 w-5 animate-spin" />
        </div>
        <div v-else-if="flows.length === 0" class="py-16 text-center text-sm text-muted-foreground">
          Nenhum fluxo criado ainda. Clique em "Novo fluxo" para começar.
        </div>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Gatilho</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Versão</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead class="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="f in flows" :key="f.id" class="cursor-pointer" @click="goEdit(f.id)">
              <TableCell class="font-medium">{{ f.name }}</TableCell>
              <TableCell class="text-sm text-muted-foreground">
                {{ TRIGGER_LABELS[f.trigger_type] ?? f.trigger_type }}
              </TableCell>
              <TableCell>
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="STATUS_LABELS[f.status]?.cls ?? 'bg-zinc-100 text-zinc-600'"
                >
                  {{ STATUS_LABELS[f.status]?.label ?? f.status }}
                </span>
              </TableCell>
              <TableCell class="text-sm">v{{ f.published_version ?? f.version }}</TableCell>
              <TableCell class="text-sm text-muted-foreground">{{ fmtDate(f.updated_at) }}</TableCell>
              <TableCell class="text-right" @click.stop>
                <div class="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" @click="goEdit(f.id)">
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" @click="onDelete(f.id, f.name)">
                    <Trash2 class="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo fluxo</DialogTitle>
          <DialogDescription>Escolha um nome e o gatilho de ativação.</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <div class="space-y-2">
            <Label for="flow-name">Nome</Label>
            <Input id="flow-name" v-model="form.name" placeholder="Ex.: Boas-vindas" />
          </div>
          <div class="space-y-2">
            <Label>Gatilho</Label>
            <Select v-model="form.trigger_type">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="(label, key) in TRIGGER_LABELS"
                  :key="key"
                  :value="key"
                >
                  {{ label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="dialogOpen = false">Cancelar</Button>
          <Button :disabled="submitting || !form.name.trim()" @click="onCreate">
            <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
