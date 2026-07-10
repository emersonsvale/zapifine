<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Workflow, Loader2, Play, Search } from 'lucide-vue-next'
import type { FlowSummary } from '~/composables/useFlows'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'trigger', flowId: string): void
}>()

const { flows, pending, load } = useFlows()

const search = ref('')
const triggering = ref<string | null>(null)

const manualChatFlows = computed(() =>
  (flows.value ?? []).filter(
    (f) => f.trigger_type === 'manual_chat' && f.status === 'published',
  ),
)

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return manualChatFlows.value
  return manualChatFlows.value.filter((f) => f.name.toLowerCase().includes(q))
})

onMounted(() => {
  if (flows.value.length === 0) {
    load().catch(() => {})
  }
})

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      search.value = ''
      triggering.value = null
    }
  },
)

function onTrigger(flow: FlowSummary) {
  triggering.value = flow.id
  emit('trigger', flow.id)
}

function onClose() {
  emit('update:open', false)
}

function dismiss() {
  emit('update:open', false)
}

defineExpose({ setTriggered: (id: string | null) => (triggering.value = id) })
</script>

<template>
  <Dialog :open="open" @update:open="dismiss">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Workflow class="h-5 w-5 text-violet-500" />
          Disparar fluxo
        </DialogTitle>
        <DialogDescription>
          Escolha um fluxo publicado para iniciar nesta conversa.
        </DialogDescription>
      </DialogHeader>

      <div v-if="manualChatFlows.length > 0" class="relative">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          v-model="search"
          type="text"
          placeholder="Buscar fluxo..."
          class="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div class="max-h-72 overflow-y-auto">
        <div v-if="pending" class="flex justify-center py-8">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>

        <div
          v-else-if="filtered.length === 0"
          class="py-8 text-center text-sm text-muted-foreground"
        >
          <template v-if="manualChatFlows.length === 0">
            Nenhum fluxo publicado do tipo "Disparo manual".
            <br />
            <NuxtLink
              to="/automacoes/fluxos"
              class="mt-1 inline-block text-violet-600 underline underline-offset-2"
              @click="onClose"
            >
              Criar fluxo
            </NuxtLink>
          </template>
          <template v-else>
            Nenhum fluxo encontrado para "{{ search }}".
          </template>
        </div>

        <div v-else class="space-y-1 py-1">
          <button
            v-for="flow in filtered"
            :key="flow.id"
            type="button"
            class="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
            :disabled="triggering === flow.id"
            @click="onTrigger(flow)"
          >
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-500/10"
            >
              <Loader2
                v-if="triggering === flow.id"
                class="h-4 w-4 animate-spin text-violet-500"
              />
              <Play v-else class="h-4 w-4 text-violet-500" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ flow.name }}</p>
              <p class="text-xs text-muted-foreground">
                v{{ flow.published_version ?? flow.version }}
              </p>
            </div>
          </button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
