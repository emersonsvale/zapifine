<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import type { FlowTriggerType } from '~/composables/useFlows'
import type { FlowColumnOption } from '~/composables/useFlowBuilderOptions'

const props = defineProps<{
  triggerType: FlowTriggerType
  config: Record<string, unknown>
  columns: FlowColumnOption[]
}>()

const emit = defineEmits<{
  update: [next: Record<string, unknown>]
}>()

const selectedColunaIds = computed<number[]>(() => {
  const arr = (props.config.coluna_ids as unknown[] | undefined) ?? []
  if (Array.isArray(arr)) {
    return arr.filter((v) => typeof v === 'number') as number[]
  }
  const single = props.config.coluna_id
  return typeof single === 'number' ? [single] : []
})

function toggleColuna(id: number) {
  const set = new Set(selectedColunaIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  emit('update', { ...props.config, coluna_ids: Array.from(set) })
}

function removeColuna(id: number) {
  emit('update', {
    ...props.config,
    coluna_ids: selectedColunaIds.value.filter((x) => x !== id),
  })
}

function colunaLabel(id: number): string {
  return props.columns.find((c) => c.id === id)?.nome ?? `#${id}`
}
</script>

<template>
  <div v-if="triggerType === 'lead_column_changed'" class="space-y-2 rounded-md border border-border bg-muted/30 p-3">
    <div class="text-xs font-medium">Colunas monitoradas</div>
    <div class="flex flex-wrap gap-1">
      <span
        v-for="id in selectedColunaIds"
        :key="id"
        class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
      >
        {{ colunaLabel(id) }}
        <button class="text-primary hover:text-primary/70" @click="removeColuna(id)">
          <X class="h-3 w-3" />
        </button>
      </span>
      <span v-if="selectedColunaIds.length === 0" class="text-xs text-muted-foreground">
        Nenhuma (dispara em qualquer)
      </span>
    </div>
    <Select :model-value="''" @update:model-value="(v) => v && toggleColuna(Number(v))">
      <SelectTrigger class="h-8 text-xs">
        <SelectValue placeholder="Adicionar coluna..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="col in columns.filter((c) => !selectedColunaIds.includes(c.id))"
          :key="col.id"
          :value="String(col.id)"
        >
          {{ col.nome }}
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>
