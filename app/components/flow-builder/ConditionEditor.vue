<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'

type Op =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is_empty'
  | 'is_not_empty'
  | 'regex'

type Rule = {
  field: string
  op: Op
  value?: unknown
  case_insensitive?: boolean
}

type Branch = {
  id: string
  label?: string
  match: 'all' | 'any'
  rules: Rule[]
  next: string | null
}

type ConditionConfig = {
  branches?: Branch[]
  else?: string | null
}

const props = defineProps<{
  config: ConditionConfig
  graphNodes: { id: string; label: string; type: string }[]
}>()

const emit = defineEmits<{
  update: [patch: Partial<ConditionConfig>]
}>()

const OP_LABELS: Record<Op, string> = {
  equals: 'igual a',
  not_equals: 'diferente de',
  contains: 'contém',
  not_contains: 'não contém',
  starts_with: 'começa com',
  ends_with: 'termina com',
  gt: 'maior que',
  gte: 'maior/igual',
  lt: 'menor que',
  lte: 'menor/igual',
  is_empty: 'vazio',
  is_not_empty: 'não vazio',
  regex: 'regex',
}

const OP_HAS_VALUE: Record<Op, boolean> = {
  equals: true,
  not_equals: true,
  contains: true,
  not_contains: true,
  starts_with: true,
  ends_with: true,
  gt: true,
  gte: true,
  lt: true,
  lte: true,
  is_empty: false,
  is_not_empty: false,
  regex: true,
}

const branches = computed<Branch[]>(() =>
  Array.isArray(props.config.branches) ? props.config.branches : [],
)

function nodeLabel(id: string): string {
  const n = props.graphNodes.find((x) => x.id === id)
  return n ? (n.label || n.type) : id
}

function patchBranches(next: Branch[]) {
  emit('update', { branches: next })
}

function addBranch() {
  const b: Branch = {
    id: crypto.randomUUID(),
    label: `Ramo ${branches.value.length + 1}`,
    match: 'all',
    rules: [{ field: '{{reply}}', op: 'equals', value: '' }],
    next: null,
  }
  patchBranches([...branches.value, b])
}

function removeBranch(idx: number) {
  patchBranches(branches.value.filter((_, i) => i !== idx))
}

function updateBranch(idx: number, patch: Partial<Branch>) {
  patchBranches(branches.value.map((b, i) => (i === idx ? { ...b, ...patch } : b)))
}

function addRule(bIdx: number) {
  const b = branches.value[bIdx]
  if (!b) return
  updateBranch(bIdx, {
    rules: [...b.rules, { field: '{{reply}}', op: 'equals', value: '' }],
  })
}

function removeRule(bIdx: number, rIdx: number) {
  const b = branches.value[bIdx]
  if (!b) return
  updateBranch(bIdx, { rules: b.rules.filter((_, i) => i !== rIdx) })
}

function updateRule(bIdx: number, rIdx: number, patch: Partial<Rule>) {
  const b = branches.value[bIdx]
  if (!b) return
  updateBranch(bIdx, {
    rules: b.rules.map((r, i) => (i === rIdx ? { ...r, ...patch } : r)),
  })
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-xs font-medium">Ramificações</div>
      <Button size="sm" variant="outline" @click="addBranch">
        <Plus class="h-3 w-3" />
        Ramo
      </Button>
    </div>

    <div
      v-for="(branch, bIdx) in branches"
      :key="branch.id"
      class="space-y-2 rounded-md border border-border p-2"
    >
      <div class="flex items-center gap-2">
        <Input
          class="h-8 text-xs"
          :model-value="branch.label ?? ''"
          placeholder="Rótulo"
          @update:model-value="updateBranch(bIdx, { label: String($event) })"
        />
        <Button size="icon" variant="ghost" class="h-8 w-8" @click="removeBranch(bIdx)">
          <Trash2 class="h-3.5 w-3.5 text-red-500" />
        </Button>
      </div>

      <div class="flex items-center gap-2">
        <Label class="text-[11px]">Combinar</Label>
        <Select
          :model-value="branch.match"
          @update:model-value="updateBranch(bIdx, { match: $event as 'all' | 'any' })"
        >
          <SelectTrigger class="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas (E)</SelectItem>
            <SelectItem value="any">Qualquer (OU)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        v-for="(rule, rIdx) in branch.rules"
        :key="rIdx"
        class="space-y-1 rounded-md bg-muted/40 p-2"
      >
        <div class="flex items-center gap-1">
          <Input
            class="h-7 flex-1 text-xs"
            :model-value="rule.field"
            placeholder="{{reply}}"
            @update:model-value="updateRule(bIdx, rIdx, { field: String($event) })"
          />
          <Button
            size="icon"
            variant="ghost"
            class="h-7 w-7"
            @click="removeRule(bIdx, rIdx)"
          >
            <Trash2 class="h-3 w-3 text-red-500" />
          </Button>
        </div>
        <Select
          :model-value="rule.op"
          @update:model-value="updateRule(bIdx, rIdx, { op: $event as Op })"
        >
          <SelectTrigger class="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="(label, key) in OP_LABELS" :key="key" :value="key">
              {{ label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Input
          v-if="OP_HAS_VALUE[rule.op]"
          class="h-7 text-xs"
          :model-value="rule.value == null ? '' : String(rule.value)"
          placeholder="Valor"
          @update:model-value="updateRule(bIdx, rIdx, { value: String($event) })"
        />
        <label class="flex items-center gap-1 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            :checked="Boolean(rule.case_insensitive)"
            @change="
              updateRule(bIdx, rIdx, {
                case_insensitive: ($event.target as HTMLInputElement).checked,
              })
            "
          />
          ignorar caixa
        </label>
      </div>

      <Button size="sm" variant="ghost" class="w-full" @click="addRule(bIdx)">
        <Plus class="h-3 w-3" />
        Regra
      </Button>

      <div class="space-y-1">
        <Label class="text-[11px]">Se combinar, ir para</Label>
        <Select
          :model-value="branch.next ?? ''"
          @update:model-value="
            updateBranch(bIdx, { next: $event ? String($event) : null })
          "
        >
          <SelectTrigger class="h-8 text-xs">
            <SelectValue :placeholder="branch.next ? nodeLabel(branch.next) : '— nenhum —'" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="n in graphNodes"
              :key="n.id"
              :value="n.id"
            >
              {{ n.label || n.type }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="space-y-1 border-t pt-2">
      <Label class="text-xs">Padrão (senão)</Label>
      <Select
        :model-value="config.else ?? ''"
        @update:model-value="emit('update', { else: $event ? String($event) : null })"
      >
        <SelectTrigger class="h-8 text-xs">
          <SelectValue :placeholder="config.else ? nodeLabel(config.else) : '— nenhum —'" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="n in graphNodes" :key="n.id" :value="n.id">
            {{ n.label || n.type }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
</template>
