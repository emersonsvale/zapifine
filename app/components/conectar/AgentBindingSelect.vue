<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Bot, Loader2 } from 'lucide-vue-next'
import type { AiAgent } from '~/composables/useAiAgents'

const props = defineProps<{ connectionId: string }>()
const { list, getBinding, setBinding } = useAiAgents()

const agents = ref<AiAgent[]>([])
const currentAgentId = ref<string>('')
const loading = ref(true)
const saving = ref(false)
const feedback = ref<string | null>(null)

onMounted(async () => {
  try {
    const [all, bindingRes] = await Promise.all([list(), getBinding(props.connectionId)])
    agents.value = all.filter((a) => a.tipo === 'orchestrator' && a.is_active)
    const b = (bindingRes.binding as { orchestrator_agent_id?: string } | null) ?? null
    currentAgentId.value = b?.orchestrator_agent_id ?? ''
  } catch (err) {
    feedback.value = err instanceof Error ? err.message : 'Erro'
  } finally {
    loading.value = false
  }
})

const hasOrchestrators = computed(() => agents.value.length > 0)

async function save() {
  if (!currentAgentId.value) return
  saving.value = true
  feedback.value = null
  try {
    await setBinding({
      whatsapp_connection_id: props.connectionId,
      orchestrator_agent_id: currentAgentId.value,
    })
    feedback.value = 'Salvo'
    setTimeout(() => (feedback.value = null), 2500)
  } catch (err) {
    feedback.value = err instanceof Error ? err.message : 'Erro ao salvar'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-1.5 rounded-md border border-dashed border-primary/30 bg-primary/5 p-2.5">
    <div class="flex items-center gap-2 text-xs font-medium">
      <Bot class="h-3.5 w-3.5 text-primary" />
      <span>Agente IA</span>
    </div>

    <div v-if="loading" class="flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 class="h-3 w-3 animate-spin" /> Carregando…
    </div>

    <div v-else-if="!hasOrchestrators" class="text-xs text-muted-foreground">
      Nenhum orquestrador criado.
      <NuxtLink to="/atendentes" class="text-primary hover:underline">Criar agente</NuxtLink>
    </div>

    <div v-else class="flex gap-1.5">
      <select
        v-model="currentAgentId"
        class="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm"
      >
        <option value="">— sem agente —</option>
        <option v-for="a in agents" :key="a.id" :value="a.id">{{ a.nome }}</option>
      </select>
      <Button size="sm" variant="outline" class="h-7 px-2 text-xs" :disabled="saving || !currentAgentId" @click="save">
        <Loader2 v-if="saving" class="h-3 w-3 animate-spin" />
        <span v-else>Salvar</span>
      </Button>
    </div>

    <p v-if="feedback" class="text-xs" :class="feedback === 'Salvo' ? 'text-emerald-600' : 'text-red-600'">
      {{ feedback }}
    </p>
  </div>
</template>
