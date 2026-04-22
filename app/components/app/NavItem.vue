<script setup lang="ts">
import { computed, type Component } from 'vue'
import { Check, Lock } from 'lucide-vue-next'

const props = defineProps<{
  to: string
  label: string
  icon: Component
  badge?: boolean
  locked?: boolean
  count?: number
}>()

const route = useRoute()

const isActive = computed(() =>
  props.to === '/'
    ? route.path === '/'
    : route.path === props.to || route.path.startsWith(`${props.to}/`),
)

const targetTo = computed(() => (props.locked ? '/planos' : props.to))

const countLabel = computed(() => {
  const n = props.count ?? 0
  if (n <= 0) return null
  return n > 99 ? '99+' : String(n)
})
</script>

<template>
  <NuxtLink
    :to="targetTo"
    :title="locked ? 'Disponível em planos superiores' : undefined"
    :class="[
      'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
      locked
        ? 'text-muted-foreground/60 hover:bg-sidebar-accent/30 hover:text-muted-foreground'
        : isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
    ]"
  >
    <span
      v-if="isActive && !locked"
      class="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary"
      aria-hidden="true"
    />
    <component :is="icon" class="h-4 w-4 shrink-0" />
    <span class="flex-1 truncate">{{ label }}</span>
    <span
      v-if="locked"
      class="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground"
      aria-label="Disponível em planos superiores"
    >
      <Lock class="h-3 w-3" />
    </span>
    <span
      v-else-if="countLabel"
      class="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
      :aria-label="`${countLabel} não lidas`"
    >
      {{ countLabel }}
    </span>
    <span
      v-else-if="badge"
      class="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
      aria-label="configurado"
    >
      <Check class="h-2.5 w-2.5" stroke-width="3" />
    </span>
  </NuxtLink>
</template>
