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
  collapsed?: boolean
  to?: string
}>()

const emit = defineEmits<{
  (e: 'expand-sidebar'): void
}>()

const route = useRoute()
const router = useRouter()

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

function onHeaderClick() {
  if (props.collapsed) {
    emit('expand-sidebar')
    open.value = true
    if (props.to && route.path !== props.to) router.push(props.to)
    return
  }
  if (props.to) {
    open.value = true
    if (route.path !== props.to) router.push(props.to)
    return
  }
  open.value = !open.value
}
</script>

<template>
  <div>
    <button
      type="button"
      :title="collapsed ? label : undefined"
      class="group relative flex w-full items-center rounded-lg text-sm transition-colors"
      :class="[
        collapsed ? 'h-10 w-10 justify-center' : 'gap-3 px-3 py-2.5',
        allLocked
          ? 'text-muted-foreground/60'
          : hasActiveChild
            ? 'text-sidebar-foreground'
            : 'text-muted-foreground hover:text-sidebar-foreground',
      ]"
      :aria-expanded="open"
      @click="onHeaderClick"
    >
      <component :is="icon" class="h-4 w-4 shrink-0" />

      <template v-if="!collapsed">
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
      </template>

      <template v-else>
        <span
          v-if="countLabel"
          class="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground"
        >
          {{ countLabel }}
        </span>
        <span
          v-else-if="allLocked"
          class="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-muted"
        >
          <Lock class="h-2 w-2 text-muted-foreground" />
        </span>
      </template>
    </button>

    <ul v-if="open && !collapsed" class="mt-0.5 space-y-0.5 pl-4">
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
