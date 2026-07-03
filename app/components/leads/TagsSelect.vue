<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { X, Plus, Check } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string[]
  suggestions?: string[]
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [tags: string[]]
}>()

const open = ref(false)
const query = ref('')
const inputEl = ref<HTMLInputElement | null>(null)
const triggerEl = ref<HTMLDivElement | null>(null)
const highlightIdx = ref(0)

const selected = computed({
  get: () => (props.modelValue ?? []).slice(),
  set: (v: string[]) => emit('update:modelValue', v),
})

function norm(s: string) {
  return s.trim().toLowerCase()
}

const availableOptions = computed<string[]>(() => {
  const selectedSet = new Set(selected.value.map(norm))
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of props.suggestions ?? []) {
    const s = String(raw ?? '').trim()
    if (!s) continue
    const n = norm(s)
    if (selectedSet.has(n) || seen.has(n)) continue
    seen.add(n)
    out.push(s)
  }
  return out
})

const filteredOptions = computed<string[]>(() => {
  const q = norm(query.value)
  if (!q) return availableOptions.value
  return availableOptions.value.filter((o) => norm(o).includes(q))
})

const canCreate = computed(() => {
  const q = query.value.trim()
  if (!q) return false
  const n = norm(q)
  const inSelected = selected.value.some((s) => norm(s) === n)
  const inOptions = availableOptions.value.some((o) => norm(o) === n)
  return !inSelected && !inOptions
})

type ListItem = { type: 'option' | 'create'; value: string }

const listItems = computed<ListItem[]>(() => {
  const opts: ListItem[] = filteredOptions.value.map((o) => ({
    type: 'option',
    value: o,
  }))
  if (canCreate.value) {
    opts.unshift({ type: 'create', value: query.value.trim() })
  }
  return opts
})

watch(listItems, () => {
  highlightIdx.value = 0
})

function addTag(tag: string) {
  const clean = tag.trim()
  if (!clean) return
  const n = norm(clean)
  if (selected.value.some((s) => norm(s) === n)) return
  selected.value = [...selected.value, clean]
  query.value = ''
}

function removeTag(tag: string) {
  const n = norm(tag)
  selected.value = selected.value.filter((s) => norm(s) !== n)
}

function pickHighlighted() {
  const item = listItems.value[highlightIdx.value]
  if (item) addTag(item.value)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (listItems.value.length > 0) {
      pickHighlighted()
    } else if (query.value.trim()) {
      addTag(query.value)
    }
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    open.value = true
    highlightIdx.value = Math.min(
      listItems.value.length - 1,
      highlightIdx.value + 1,
    )
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightIdx.value = Math.max(0, highlightIdx.value - 1)
    return
  }
  if (e.key === 'Escape') {
    open.value = false
    return
  }
  if (e.key === 'Backspace' && !query.value && selected.value.length > 0) {
    e.preventDefault()
    removeTag(selected.value[selected.value.length - 1]!)
    return
  }
  if (e.key === ',' || e.key === ';') {
    e.preventDefault()
    if (query.value.trim()) addTag(query.value)
  }
}

function onWrapperClick() {
  open.value = true
  nextTick(() => inputEl.value?.focus())
}

function onBlur(e: FocusEvent) {
  const next = e.relatedTarget as Node | null
  if (next && triggerEl.value?.contains(next)) return
  const q = query.value.trim()
  if (q) addTag(q)
  setTimeout(() => {
    open.value = false
  }, 120)
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <div
        ref="triggerEl"
        class="flex min-h-10 w-full flex-wrap items-center gap-1 rounded-md border bg-transparent px-2 py-1.5 text-sm focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 cursor-text"
        @click="onWrapperClick"
      >
        <span
          v-for="t in selected"
          :key="t"
          class="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-medium"
        >
          {{ t }}
          <button
            type="button"
            class="hover:text-destructive"
            :aria-label="`Remover tag ${t}`"
            @click.stop="removeTag(t)"
          >
            <X class="h-3 w-3" />
          </button>
        </span>
        <input
          ref="inputEl"
          v-model="query"
          type="text"
          class="min-w-[60px] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
          :placeholder="selected.length === 0 ? (placeholder ?? 'Adicionar tags...') : ''"
          @keydown="onKeydown"
          @focus="open = true"
          @blur="onBlur"
        >
      </div>
    </PopoverTrigger>
    <PopoverContent
      class="p-1 w-[--radix-popover-trigger-width]"
      align="start"
      :side-offset="4"
      @open-auto-focus.prevent
    >
      <div class="max-h-64 overflow-y-auto">
        <p
          v-if="listItems.length === 0"
          class="px-3 py-2 text-xs text-muted-foreground"
        >
          Nenhuma tag. Digite para criar.
        </p>
        <button
          v-for="(item, i) in listItems"
          :key="`${item.type}-${item.value}`"
          type="button"
          class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm"
          :class="i === highlightIdx ? 'bg-accent' : 'hover:bg-accent/60'"
          @mousedown.prevent="addTag(item.value)"
          @mouseenter="highlightIdx = i"
        >
          <Plus v-if="item.type === 'create'" class="h-3.5 w-3.5 text-emerald-500" />
          <Check v-else class="h-3.5 w-3.5 text-muted-foreground" />
          <span class="truncate">
            <template v-if="item.type === 'create'">
              Criar
              <span class="font-semibold">"{{ item.value }}"</span>
            </template>
            <template v-else>{{ item.value }}</template>
          </span>
        </button>
      </div>
    </PopoverContent>
  </Popover>
</template>
