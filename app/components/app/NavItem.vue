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
  collapsed?: boolean
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
    :title="
      locked
        ? 'Disponível em planos superiores'
        : collapsed
          ? label
          : undefined
    "
    :class="[
      'group relative flex items-center rounded-lg text-sm transition-colors',
      collapsed
        ? 'h-10 w-10 justify-center'
        : 'gap-3 px-3 py-2.5',
      locked
        ? 'text-muted-foreground/60 hover:bg-sidebar-accent/30 hover:text-muted-foreground'
        : isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
    ]"
  >
    <span
      v-if="isActive && !locked && !collapsed"
      class="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary"
      aria-hidden="true"
    />
    <component :is="icon" class="h-4 w-4 shrink-0" />

    <span v-if="!collapsed" class="flex-1 truncate">{{ label }}</span>

    <template v-if="!collapsed">
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
    </template>

    <template v-else>
      <span
        v-if="countLabel"
        class="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground"
      >
        {{ countLabel }}
      </span>
      <span
        v-else-if="locked"
        class="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-muted"
      >
        <Lock class="h-2 w-2 text-muted-foreground" />
      </span>
    </template>
  </NuxtLink>
</template>
