<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { getNodeMeta } from './node-catalog'

const props = defineProps<{
  id: string
  data: {
    label?: string
    nodeType: string
    summary?: string
  }
  selected?: boolean
}>()

const meta = computed(() => getNodeMeta(props.data.nodeType))
const isTrigger = computed(() => props.data.nodeType === 'trigger')
const isEnd = computed(() => props.data.nodeType === 'end')
</script>

<template>
  <div
    class="min-w-[200px] max-w-[260px] rounded-lg border-2 bg-card shadow-sm transition"
    :class="selected ? 'border-primary' : 'border-border'"
  >
    <div class="flex items-center gap-2 border-b border-border/60 p-2">
      <div
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white"
        :class="meta?.color ?? 'bg-zinc-500'"
      >
        <component :is="meta?.icon" v-if="meta" class="h-4 w-4" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-semibold">
          {{ data.label || meta?.label || data.nodeType }}
        </div>
        <div class="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
          {{ meta?.label ?? data.nodeType }}
        </div>
      </div>
    </div>
    <div v-if="data.summary" class="max-h-16 overflow-hidden p-2 text-xs text-muted-foreground">
      {{ data.summary }}
    </div>

    <Handle v-if="!isTrigger" type="target" :position="Position.Top" />
    <Handle v-if="!isEnd" type="source" :position="Position.Bottom" />
  </div>
</template>
