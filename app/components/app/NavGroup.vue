<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { ChevronDown, Lock } from 'lucide-vue-next'

type Child = {
  to: string
  label: string
  icon: Component
  badge?: boolean
  locked?: boolean
  count?: number
}

const props = defineProps<{
  label: string
  icon: Component
  children: Child[]
}>()

const route = useRoute()

const hasActiveChild = computed(() =>
  props.children.some(
    (c) => route.path === c.to || route.path.startsWith(`${c.to}/`),
  ),
)

const allLocked = computed(() => props.children.every((c) => c.locked))

const totalCount = computed(() =>
  props.children.reduce((acc, c) => acc + (c.count ?? 0), 0),
)
const countLabel = computed(() => {
  const n = totalCount.value
  if (n <= 0) return null
  return n > 99 ? '99+' : String(n)
})

const open = ref(hasActiveChild.value)

watch(hasActiveChild, (v) => {
  if (v) open.value = true
})
</script>

<template>
  <div>
    <button
      type="button"
      class="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
      :class="
        allLocked
          ? 'text-muted-foreground/60'
          : hasActiveChild
            ? 'text-sidebar-foreground'
            : 'text-muted-foreground hover:text-sidebar-foreground'
      "
      :aria-expanded="open"
      @click="open = !open"
    >
      <component :is="icon" class="h-4 w-4 shrink-0" />
      <span class="flex-1 truncate text-left">{{ label }}</span>
      <Lock v-if="allLocked" class="h-3 w-3 shrink-0 text-muted-foreground" />
      <template v-else>
        <span
          v-if="countLabel && !open"
          class="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
          :aria-label="`${countLabel} não lidas`"
        >
          {{ countLabel }}
        </span>
        <ChevronDown
          class="h-3.5 w-3.5 shrink-0 transition-transform"
          :class="{ 'rotate-180': open }"
        />
      </template>
    </button>

    <ul v-if="open" class="mt-0.5 space-y-0.5 pl-4">
      <li v-for="child in children" :key="child.to">
        <AppNavItem
          :to="child.to"
          :label="child.label"
          :icon="child.icon"
          :badge="child.badge"
          :locked="child.locked"
          :count="child.count"
        />
      </li>
    </ul>
  </div>
</template>
