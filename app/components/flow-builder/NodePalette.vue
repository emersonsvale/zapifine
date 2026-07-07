<script setup lang="ts">
import { computed } from 'vue'
import { NODE_CATALOG, type NodeCatalogEntry } from './node-catalog'

function onDragStart(event: DragEvent, type: string) {
  if (!event.dataTransfer) return
  event.dataTransfer.setData('application/flow-node-type', type)
  event.dataTransfer.effectAllowed = 'move'
}

const CATEGORY_LABEL: Record<NodeCatalogEntry['category'], string> = {
  trigger: 'Gatilho',
  action: 'Ações',
  logic: 'Lógica',
  flow: 'Fluxo',
  lead: 'Lead',
  ai: 'IA',
}

const CATEGORY_ORDER: NodeCatalogEntry['category'][] = [
  'trigger',
  'action',
  'logic',
  'lead',
  'ai',
  'flow',
]

const grouped = computed(() =>
  CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABEL[cat],
    items: NODE_CATALOG.filter((n) => n.category === cat),
  })).filter((g) => g.items.length > 0),
)
</script>

<template>
  <div class="flex h-full flex-col gap-3 overflow-y-auto p-3">
    <div class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      Arraste para o canvas
    </div>
    <div v-for="group in grouped" :key="group.category" class="space-y-1">
      <div class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {{ group.label }}
      </div>
      <div
        v-for="entry in group.items"
        :key="entry.type"
        :draggable="true"
        class="group cursor-grab rounded-md border border-border bg-card p-2 transition hover:border-primary/50 active:cursor-grabbing"
        @dragstart="onDragStart($event, entry.type)"
      >
        <div class="flex items-center gap-2">
          <div
            class="flex h-8 w-8 items-center justify-center rounded-md text-white"
            :class="entry.color"
          >
            <component :is="entry.icon" class="h-4 w-4" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium">{{ entry.label }}</div>
            <div class="truncate text-xs text-muted-foreground">
              {{ entry.description }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
