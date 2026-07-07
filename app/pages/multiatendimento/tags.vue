<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Tags as TagsIcon,
  Search,
  Pencil,
  Trash2,
  Merge,
  Loader2,
  ArrowUpDown,
} from 'lucide-vue-next'

useHead({ title: 'Multiatendimento - Tags' })

const { stats, pending, refresh, renameTag, deleteTag, mergeTags } = useTags()
const { toast, confirm } = useAlerts()

type SortKey = 'name' | 'count'
const query = ref('')
const sortKey = ref<SortKey>('name')
const sortDir = ref<'asc' | 'desc'>('asc')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const base = (stats.value ?? []).filter((t) =>
    q ? t.name.toLowerCase().includes(q) : true,
  )
  const dir = sortDir.value === 'asc' ? 1 : -1
  return base.slice().sort((a, b) => {
    if (sortKey.value === 'count') return (a.count - b.count) * dir
    return a.name.localeCompare(b.name, 'pt-BR') * dir
  })
})

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = key === 'count' ? 'desc' : 'asc'
  }
}

const renameOpen = ref(false)
const renameSource = ref('')
const renameTarget = ref('')
const renameBusy = ref(false)

function openRename(name: string) {
  renameSource.value = name
  renameTarget.value = name
  renameOpen.value = true
}

async function submitRename() {
  const to = renameTarget.value.trim()
  if (!to) return
  renameBusy.value = true
  try {
    await renameTag(renameSource.value, to)
    toast.success(`Tag renomeada para "${to}".`)
    renameOpen.value = false
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao renomear.')
  } finally {
    renameBusy.value = false
  }
}

async function handleDelete(name: string) {
  const ok = await confirm({
    title: 'Excluir tag',
    description: `A tag "${name}" será removida de todos os leads. Ação não pode ser desfeita.`,
    confirmLabel: 'Excluir',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await deleteTag(name)
    toast.success(`Tag "${name}" removida.`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao excluir.')
  }
}

const mergeOpen = ref(false)
const mergeSources = ref<string[]>([])
const mergeTarget = ref('')
const mergeBusy = ref(false)

const availableTargets = computed(() =>
  (stats.value ?? []).map((t) => t.name),
)

function openMerge() {
  mergeSources.value = []
  mergeTarget.value = ''
  mergeOpen.value = true
}

function toggleSource(name: string) {
  const set = new Set(mergeSources.value)
  if (set.has(name)) set.delete(name)
  else set.add(name)
  mergeSources.value = Array.from(set)
}

async function submitMerge() {
  const target = mergeTarget.value.trim()
  if (!target || mergeSources.value.length === 0) return
  mergeBusy.value = true
  try {
    await mergeTags(mergeSources.value, target)
    toast.success(`${mergeSources.value.length} tag(s) mescladas em "${target}".`)
    mergeOpen.value = false
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao mesclar.')
  } finally {
    mergeBusy.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">Tags</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Gerencie as tags atribuídas aos leads. Renomeie, exclua ou mescle em massa.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" :disabled="pending" @click="refresh()">
          Atualizar
        </Button>
        <Button
          :disabled="(stats?.length ?? 0) < 2"
          @click="openMerge"
        >
          <Merge class="h-4 w-4" />
          Mesclar
        </Button>
      </div>
    </div>

    <Card>
      <CardHeader>
        <div class="flex items-center gap-2">
          <TagsIcon class="h-5 w-5 text-primary" />
          <CardTitle class="text-xl">Todas as tags</CardTitle>
        </div>
        <CardDescription>
          Lista agregada das tags em uso pelos leads da empresa.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="relative max-w-sm">
          <Search
            class="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input v-model="query" placeholder="Buscar tag..." class="pl-8" />
        </div>

        <div class="rounded-md border">
          <table class="w-full text-sm">
            <thead class="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th class="px-4 py-2">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 font-medium"
                    @click="toggleSort('name')"
                  >
                    Tag
                    <ArrowUpDown class="h-3 w-3" />
                  </button>
                </th>
                <th class="px-4 py-2">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 font-medium"
                    @click="toggleSort('count')"
                  >
                    Leads
                    <ArrowUpDown class="h-3 w-3" />
                  </button>
                </th>
                <th class="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pending">
                <td colspan="3" class="px-4 py-6 text-center text-muted-foreground">
                  <Loader2 class="mx-auto h-4 w-4 animate-spin" />
                </td>
              </tr>
              <tr
                v-else-if="filtered.length === 0"
                class="text-muted-foreground"
              >
                <td colspan="3" class="px-4 py-6 text-center">
                  {{ query ? 'Nenhuma tag encontrada.' : 'Nenhuma tag cadastrada.' }}
                </td>
              </tr>
              <tr
                v-for="t in filtered"
                v-else
                :key="t.name"
                class="border-t"
              >
                <td class="px-4 py-2">
                  <span
                    class="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs font-medium"
                  >
                    {{ t.name }}
                  </span>
                </td>
                <td class="px-4 py-2 tabular-nums">{{ t.count }}</td>
                <td class="px-4 py-2">
                  <div class="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="openRename(t.name)"
                    >
                      <Pencil class="h-4 w-4" />
                      Renomear
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      class="text-destructive hover:text-destructive"
                      @click="handleDelete(t.name)"
                    >
                      <Trash2 class="h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    <Dialog v-model:open="renameOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Renomear tag</DialogTitle>
          <DialogDescription>
            A tag "{{ renameSource }}" será atualizada em todos os leads.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-2 py-2">
          <Label for="rename-target">Novo nome</Label>
          <Input
            id="rename-target"
            v-model="renameTarget"
            placeholder="Novo nome da tag"
            @keydown.enter.prevent="submitRename"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="renameOpen = false">Cancelar</Button>
          <Button
            :disabled="renameBusy || !renameTarget.trim()"
            @click="submitRename"
          >
            <Loader2 v-if="renameBusy" class="h-4 w-4 animate-spin" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="mergeOpen">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mesclar tags</DialogTitle>
          <DialogDescription>
            Selecione as tags de origem e a tag de destino. Origens serão substituídas nos leads.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <div class="space-y-2">
            <Label>Tags de origem</Label>
            <div class="max-h-60 overflow-y-auto rounded-md border p-2">
              <label
                v-for="t in stats ?? []"
                :key="t.name"
                class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent/60"
              >
                <input
                  type="checkbox"
                  :checked="mergeSources.includes(t.name)"
                  :disabled="t.name === mergeTarget"
                  @change="toggleSource(t.name)"
                >
                <span class="flex-1">{{ t.name }}</span>
                <span class="text-xs text-muted-foreground">{{ t.count }}</span>
              </label>
            </div>
          </div>
          <div class="space-y-2">
            <Label for="merge-target">Tag de destino</Label>
            <Input
              id="merge-target"
              v-model="mergeTarget"
              placeholder="Nome da tag final"
              list="merge-target-options"
            />
            <datalist id="merge-target-options">
              <option v-for="n in availableTargets" :key="n" :value="n" />
            </datalist>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="mergeOpen = false">Cancelar</Button>
          <Button
            :disabled="
              mergeBusy || !mergeTarget.trim() || mergeSources.length === 0
            "
            @click="submitMerge"
          >
            <Loader2 v-if="mergeBusy" class="h-4 w-4 animate-spin" />
            Mesclar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
