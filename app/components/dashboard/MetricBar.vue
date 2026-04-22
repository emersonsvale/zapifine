<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    value: number
    color?: 'emerald' | 'blue'
  }>(),
  { color: 'emerald' },
)

const clamped = computed(() => Math.max(0, Math.min(100, props.value)))
const barClass = computed(() =>
  props.color === 'blue' ? 'bg-blue-500' : 'bg-emerald-500',
)
</script>

<template>
  <div>
    <div class="flex items-center justify-between text-sm">
      <span>{{ label }}</span>
      <span class="font-medium">{{ clamped }}%</span>
    </div>
    <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        :class="barClass"
        class="h-full rounded-full transition-all"
        :style="{ width: `${clamped}%` }"
      />
    </div>
  </div>
</template>
