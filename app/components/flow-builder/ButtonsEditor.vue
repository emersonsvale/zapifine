<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'

type Btn = { id: string; label: string }

const props = defineProps<{
  buttons: unknown
}>()

const emit = defineEmits<{
  update: [next: Btn[]]
}>()

const items = computed<Btn[]>(() => {
  if (!Array.isArray(props.buttons)) return []
  return props.buttons
    .filter((b): b is Record<string, unknown> => !!b && typeof b === 'object')
    .map((b) => ({
      id: typeof b.id === 'string' ? b.id : '',
      label: typeof b.label === 'string' ? b.label : '',
    }))
})

const MAX = 3

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32)
}

function addButton() {
  if (items.value.length >= MAX) return
  const idx = items.value.length + 1
  emit('update', [...items.value, { id: `btn_${idx}`, label: `Opção ${idx}` }])
}

function updateAt(i: number, patch: Partial<Btn>) {
  emit(
    'update',
    items.value.map((b, idx) => {
      if (idx !== i) return b
      const next = { ...b, ...patch }
      if (patch.label !== undefined && (!b.id || b.id.startsWith('btn_'))) {
        const slug = slugify(patch.label)
        if (slug) next.id = slug
      }
      return next
    }),
  )
}

function removeAt(i: number) {
  emit(
    'update',
    items.value.filter((_, idx) => idx !== i),
  )
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <Label class="text-xs">Botões ({{ items.length }}/{{ MAX }})</Label>
      <Button size="sm" variant="outline" :disabled="items.length >= MAX" @click="addButton">
        <Plus class="h-3 w-3" />
        Botão
      </Button>
    </div>

    <div v-if="items.length === 0" class="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
      Nenhum botão. Máx {{ MAX }}.
    </div>

    <div
      v-for="(btn, i) in items"
      :key="i"
      class="space-y-1 rounded-md border border-border bg-muted/30 p-2"
    >
      <div class="flex items-center gap-1">
        <Label class="text-[10px] w-12 shrink-0">Rótulo</Label>
        <Input
          class="h-7 flex-1 text-xs"
          :model-value="btn.label"
          placeholder="Falar sobre X"
          @update:model-value="updateAt(i, { label: String($event) })"
        />
        <Button size="icon" variant="ghost" class="h-7 w-7" @click="removeAt(i)">
          <Trash2 class="h-3 w-3 text-red-500" />
        </Button>
      </div>
      <div class="flex items-center gap-1">
        <Label class="text-[10px] w-12 shrink-0">ID</Label>
        <Input
          class="h-7 flex-1 font-mono text-xs"
          :model-value="btn.id"
          placeholder="opcao_x"
          @update:model-value="updateAt(i, { id: String($event) })"
        />
      </div>
    </div>

    <p class="text-[11px] text-muted-foreground">
      <span v-pre>Use o ID no <code>condition</code> comparando <code>{{reply_button_id}}</code>.</span>
    </p>
  </div>
</template>
