<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ArrowLeft, Loader2, Save, Bot as BotIcon } from 'lucide-vue-next'
import type { AiAgent, ToolCatalogItem } from '~/composables/useAiAgents'

const feedback = ref<{ kind: 'ok' | 'err'; text: string } | null>(null)
function notify(kind: 'ok' | 'err', text: string) {
  feedback.value = { kind, text }
  setTimeout(() => (feedback.value = null), 3500)
}

useHead({ title: 'Editar agente - Zapifine' })

const route = useRoute()
const agentId = route.params.id as string
const { get, patch, setTools, setSpecialists, toolsCatalog, list } = useAiAgents()

const loading = ref(true)
const saving = ref(false)
const agent = ref<AiAgent | null>(null)
const catalog = ref<ToolCatalogItem[]>([])
const enabledTools = ref<Set<string>>(new Set())
const specialists = ref<Array<{ specialist_id: string; when_use_hint: string }>>([])
const availableSpecialists = ref<AiAgent[]>([])

async function refresh() {
  loading.value = true
  try {
    const [cfg, cat, all] = await Promise.all([get(agentId), toolsCatalog(), list()])
    agent.value = cfg.agent
    enabledTools.value = new Set(cfg.tools.map((t) => t.tool_slug))
    specialists.value = cfg.specialists
    catalog.value = cat
    availableSpecialists.value = all.filter((a) => a.tipo === 'specialist' && a.id !== agentId)
  } catch (err) {
    notify('err', err instanceof Error ? err.message : 'Erro ao carregar')
  } finally {
    loading.value = false
  }
}

onMounted(refresh)

const isOrchestrator = computed(() => agent.value?.tipo === 'orchestrator')

async function handleSave() {
  if (!agent.value) return
  saving.value = true
  try {
    await patch(agent.value.id, {
      nome: agent.value.nome,
      model: agent.value.model,
      system_prompt: agent.value.system_prompt,
      temperature: agent.value.temperature ?? 0.4,
      is_active: agent.value.is_active,
    })
    await setTools(agent.value.id, Array.from(enabledTools.value))
    if (isOrchestrator.value) {
      await setSpecialists(
        agent.value.id,
        specialists.value.filter((s) => s.specialist_id && s.when_use_hint.trim().length > 0),
      )
    }
    notify('ok', 'Agente salvo')
  } catch (err) {
    notify('err', err instanceof Error ? err.message : 'Erro ao salvar')
  } finally {
    saving.value = false
  }
}

function toggleTool(slug: string, on: boolean) {
  if (on) enabledTools.value.add(slug)
  else enabledTools.value.delete(slug)
}

function addSpecialist() {
  specialists.value.push({ specialist_id: '', when_use_hint: '' })
}

function removeSpecialist(idx: number) {
  specialists.value.splice(idx, 1)
}
</script>

<template>
  <div class="mx-auto max-w-3xl p-4 md:p-6">
    <div class="mb-4 flex items-center gap-2">
      <Button variant="ghost" size="icon" @click="navigateTo('/atendentes')">
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <h1 class="text-xl font-semibold">Editar agente</h1>
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
      <Loader2 class="h-4 w-4 animate-spin" /> Carregando…
    </div>

    <div v-else-if="agent" class="space-y-4">
      <Card>
        <CardHeader>
          <div class="flex items-center gap-2">
            <BotIcon class="h-5 w-5 text-primary" />
            <CardTitle>{{ agent.tipo === 'orchestrator' ? 'Orquestrador' : 'Especialista' }}</CardTitle>
          </div>
        </CardHeader>
        <CardContent class="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input v-model="agent.nome" />
          </div>
          <div>
            <Label>Modelo</Label>
            <Select v-model="agent.model">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">gpt-4o-mini (rápido e barato)</SelectItem>
                <SelectItem value="gpt-4o">gpt-4o (mais capaz)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Temperatura ({{ Number(agent.temperature ?? 0.4).toFixed(2) }})</Label>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              :value="agent.temperature ?? 0.4"
              @input="agent.temperature = Number(($event.target as HTMLInputElement).value)"
              class="w-full"
            />
          </div>
          <div>
            <Label>Personalidade / Prompt</Label>
            <textarea
              v-model="agent.system_prompt"
              rows="12"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm font-mono"
            />
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="ativo" v-model="agent.is_active" />
            <Label for="ativo">Agente ativo</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ferramentas</CardTitle>
          <CardDescription>Ações que este agente pode executar no CRM.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-2">
          <div v-if="catalog.length === 0" class="text-sm text-muted-foreground">
            Nenhuma ferramenta cadastrada.
          </div>
          <label v-for="t in catalog" :key="t.slug" class="flex items-start gap-3 rounded-md border p-3 hover:bg-accent/40 cursor-pointer">
            <input
              type="checkbox"
              :checked="enabledTools.has(t.slug)"
              @change="toggleTool(t.slug, ($event.target as HTMLInputElement).checked)"
              class="mt-1"
            />
            <div class="flex-1">
              <div class="font-medium text-sm">{{ t.name }}</div>
              <div class="text-xs text-muted-foreground">{{ t.description }}</div>
            </div>
          </label>
        </CardContent>
      </Card>

      <Card v-if="isOrchestrator">
        <CardHeader>
          <CardTitle>Especialistas conectados</CardTitle>
          <CardDescription>
            O orquestrador pode delegar tarefas a especialistas. Descreva quando cada um deve ser usado.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-2">
          <div v-if="availableSpecialists.length === 0" class="text-sm text-muted-foreground">
            Crie agentes tipo "Especialista" para vincular aqui.
          </div>
          <div v-for="(s, idx) in specialists" :key="idx" class="rounded-md border p-3 space-y-2">
            <div class="flex gap-2">
              <Select v-model="s.specialist_id">
                <SelectTrigger class="flex-1"><SelectValue placeholder="Escolher especialista" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="sp in availableSpecialists" :key="sp.id" :value="sp.id">
                    {{ sp.nome }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" @click="removeSpecialist(idx)">Remover</Button>
            </div>
            <textarea
              v-model="s.when_use_hint"
              rows="2"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="Ex: Use quando o cliente pedir preço ou disponibilidade de produtos."
            />
          </div>
          <Button variant="outline" size="sm" @click="addSpecialist" :disabled="availableSpecialists.length === 0">
            + Adicionar especialista
          </Button>
        </CardContent>
      </Card>

      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="navigateTo('/atendentes')">Voltar</Button>
        <Button @click="handleSave" :disabled="saving">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          Salvar
        </Button>
      </div>
    </div>
  </div>
</template>
