<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Bot as BotIcon, User, Loader2, Trash2 } from 'lucide-vue-next'
import type { AiAgent } from '~/composables/useAiAgents'

const feedback = ref<{ kind: 'ok' | 'err'; text: string } | null>(null)
function notify(kind: 'ok' | 'err', text: string) {
  feedback.value = { kind, text }
  setTimeout(() => (feedback.value = null), 3500)
}

useHead({ title: 'Atendentes IA - Zapifine' })

const { list, create, remove } = useAiAgents()
const agents = ref<AiAgent[]>([])
const loading = ref(true)
const creating = ref(false)

const dialogOpen = ref(false)
const form = ref({ nome: '', tipo: 'orchestrator' as 'orchestrator' | 'specialist', system_prompt: '' })

async function refresh() {
  loading.value = true
  try {
    agents.value = await list()
  } catch (err) {
    notify('err', err instanceof Error ? err.message : 'Erro ao carregar agentes')
  } finally {
    loading.value = false
  }
}

onMounted(refresh)

async function handleCreate() {
  if (!form.value.nome.trim() || !form.value.system_prompt.trim()) {
    notify('err', 'Nome e prompt são obrigatórios')
    return
  }
  creating.value = true
  try {
    const agent = await create({
      nome: form.value.nome.trim(),
      tipo: form.value.tipo,
      system_prompt: form.value.system_prompt.trim(),
    })
    notify('ok', 'Agente criado')
    dialogOpen.value = false
    form.value = { nome: '', tipo: 'orchestrator', system_prompt: '' }
    await refresh()
    await navigateTo(`/atendentes/${agent.id}`)
  } catch (err) {
    notify('err', err instanceof Error ? err.message : 'Erro ao criar')
  } finally {
    creating.value = false
  }
}

async function handleRemove(agent: AiAgent) {
  if (!confirm(`Excluir agente "${agent.nome}"?`)) return
  try {
    await remove(agent.id)
    notify('ok', 'Agente excluído')
    await refresh()
  } catch (err) {
    notify('err', err instanceof Error ? err.message : 'Erro ao excluir')
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl p-4 md:p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Atendentes IA</h1>
        <p class="text-sm text-muted-foreground">
          Crie agentes com personalidades e funções distintas para atender seus clientes.
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" @click="navigateTo('/atendentes/conhecimento')">
          Base de conhecimento
        </Button>
      </div>
      <Dialog v-model:open="dialogOpen">
        <DialogTrigger as-child>
          <Button>
            <Plus class="h-4 w-4" />
            Novo agente
          </Button>
        </DialogTrigger>
        <DialogContent class="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo agente IA</DialogTitle>
            <DialogDescription>
              Configure a personalidade principal aqui; ajustes finos e ferramentas na próxima tela.
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input v-model="form.nome" placeholder="Ex: Ana - Atendente principal" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select v-model="form.tipo">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="orchestrator">Orquestrador (fala com cliente)</SelectItem>
                  <SelectItem value="specialist">Especialista (função interna)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prompt / Personalidade</Label>
              <textarea
                v-model="form.system_prompt"
                rows="8"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                placeholder="Você é a Ana, atendente da empresa X. Seu papel é receber os clientes, entender a necessidade e conduzir para agendamento ou compra."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="dialogOpen = false" :disabled="creating">Cancelar</Button>
            <Button @click="handleCreate" :disabled="creating">
              <Loader2 v-if="creating" class="h-4 w-4 animate-spin" />
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    <div
      v-if="feedback"
      :class="[
        'mb-4 rounded-md border px-3 py-2 text-sm',
        feedback.kind === 'ok'
          ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200'
          : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200',
      ]"
    >
      {{ feedback.text }}
    </div>

    <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 class="h-4 w-4 animate-spin" />
      Carregando…
    </div>

    <div v-else-if="agents.length === 0" class="rounded-lg border border-dashed p-8 text-center">
      <BotIcon class="mx-auto h-10 w-10 text-muted-foreground" />
      <p class="mt-3 text-sm text-muted-foreground">
        Nenhum agente ainda. Crie o primeiro para começar a automatizar seu atendimento.
      </p>
    </div>

    <div v-else class="grid gap-3 md:grid-cols-2">
      <Card v-for="a in agents" :key="a.id" class="flex flex-col">
        <CardHeader>
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2">
              <BotIcon v-if="a.tipo === 'orchestrator'" class="h-5 w-5 text-primary" />
              <User v-else class="h-5 w-5 text-muted-foreground" />
              <CardTitle class="text-base">{{ a.nome }}</CardTitle>
            </div>
            <Badge :variant="a.is_active ? 'default' : 'secondary'">
              {{ a.is_active ? 'Ativo' : 'Inativo' }}
            </Badge>
          </div>
          <CardDescription>
            {{ a.tipo === 'orchestrator' ? 'Orquestrador' : 'Especialista' }} · {{ a.model }}
          </CardDescription>
        </CardHeader>
        <CardContent class="flex-1">
          <p class="line-clamp-3 text-sm text-muted-foreground">
            {{ a.system_prompt }}
          </p>
        </CardContent>
        <CardFooter class="justify-between">
          <Button variant="outline" size="sm" @click="navigateTo(`/atendentes/${a.id}`)">
            Editar
          </Button>
          <Button variant="ghost" size="icon" @click="handleRemove(a)" title="Excluir">
            <Trash2 class="h-4 w-4 text-destructive" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
