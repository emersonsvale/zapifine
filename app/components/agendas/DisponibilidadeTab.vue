<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Plus, Trash2, Save, Loader2, CalendarOff, CalendarClock } from 'lucide-vue-next'
import type { HorarioInput } from '~/composables/useDisponibilidade'

const {
  isOwner,
  selectedUserId,
  teamMembers,
  loadTeam,
  horarios,
  loadHorarios,
  saveHorarios,
  excecoes,
  loadExcecoes,
  addExcecao,
  deleteExcecao,
} = useDisponibilidade()

const { toast, confirm } = useAlerts()

type Slot = { weekday: number; start_time: string; end_time: string; ativo: boolean }
const slots = ref<Slot[]>([])
const saving = ref(false)
const loading = ref(false)

const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const newExcecao = ref({
  data: '',
  kind: 'bloqueio' as 'bloqueio' | 'override',
  start_time: '',
  end_time: '',
  motivo: '',
})

function rebuildSlotsFromHorarios() {
  slots.value = horarios.value.map((h) => ({
    weekday: h.weekday,
    start_time: (h.start_time ?? '09:00').slice(0, 5),
    end_time: (h.end_time ?? '18:00').slice(0, 5),
    ativo: h.ativo ?? true,
  }))
}

watch(horarios, rebuildSlotsFromHorarios, { deep: true })

async function reload() {
  if (!selectedUserId.value) return
  loading.value = true
  try {
    await Promise.all([
      loadHorarios(selectedUserId.value),
      loadExcecoes(selectedUserId.value),
    ])
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao carregar.')
  } finally {
    loading.value = false
  }
}

watch(selectedUserId, () => reload())

onMounted(async () => {
  try {
    await loadTeam()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao carregar equipe.')
  }
  await reload()
})

function addSlot(weekday: number) {
  slots.value.push({ weekday, start_time: '09:00', end_time: '18:00', ativo: true })
}

function removeSlot(idx: number) {
  slots.value.splice(idx, 1)
}

const slotsByDay = computed(() => {
  const map: Record<number, Array<{ slot: Slot; index: number }>> = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
  }
  slots.value.forEach((slot, index) => {
    map[slot.weekday]?.push({ slot, index })
  })
  return map
})

async function onSave() {
  if (!selectedUserId.value) return
  for (const s of slots.value) {
    if (s.end_time <= s.start_time) {
      toast.error(`Horário inválido em ${weekdayNames[s.weekday]}: fim deve ser após início.`)
      return
    }
  }
  saving.value = true
  try {
    const items: HorarioInput[] = slots.value.map((s) => ({
      weekday: s.weekday,
      start_time: s.start_time,
      end_time: s.end_time,
      ativo: s.ativo,
    }))
    await saveHorarios({ user_id: selectedUserId.value, items })
    toast.success('Horários salvos.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao salvar.')
  } finally {
    saving.value = false
  }
}

async function onAddExcecao() {
  if (!selectedUserId.value) return
  if (!newExcecao.value.data) {
    toast.error('Informe a data.')
    return
  }
  if (newExcecao.value.kind === 'override') {
    if (!newExcecao.value.start_time || !newExcecao.value.end_time) {
      toast.error('Override exige horário de início e fim.')
      return
    }
  }
  try {
    await addExcecao({
      user_id: selectedUserId.value,
      excecao: {
        data: newExcecao.value.data,
        kind: newExcecao.value.kind,
        start_time: newExcecao.value.kind === 'override' ? newExcecao.value.start_time : null,
        end_time: newExcecao.value.kind === 'override' ? newExcecao.value.end_time : null,
        motivo: newExcecao.value.motivo.trim() || null,
      },
    })
    newExcecao.value = { data: '', kind: 'bloqueio', start_time: '', end_time: '', motivo: '' }
    toast.success('Exceção adicionada.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao adicionar exceção.')
  }
}

async function onDeleteExcecao(id: string) {
  const ok = await confirm({
    title: 'Remover exceção',
    description: 'Esta ação não pode ser desfeita.',
    variant: 'danger',
    confirmLabel: 'Remover',
  })
  if (!ok) return
  try {
    await deleteExcecao(id)
    toast.success('Exceção removida.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao remover.')
  }
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
</script>

<template>
  <div class="space-y-6">
    <Card class="p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold">Disponibilidade do atendente</h3>
          <p class="text-sm text-muted-foreground">
            Defina os horários semanais e exceções por usuário.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-sm">Usuário:</Label>
          <Select v-model="selectedUserId" :disabled="!isOwner && teamMembers.length <= 1">
            <SelectTrigger class="w-[260px]">
              <SelectValue placeholder="Selecione um usuário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="m in teamMembers"
                :key="m.id"
                :value="m.id"
              >
                {{ m.nome ?? m.email }}
                <span v-if="m.funcao_user" class="text-muted-foreground"> · {{ m.funcao_user }}</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <CalendarClock class="h-4 w-4 text-muted-foreground" />
          <h4 class="font-semibold">Horários semanais</h4>
        </div>
        <Button :disabled="saving || loading" @click="onSave">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          Salvar horários
        </Button>
      </div>

      <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="(name, idx) in weekdayNames"
          :key="idx"
          class="rounded-md border bg-card/50 p-3 space-y-2"
        >
          <div class="flex items-center justify-between">
            <span class="font-semibold">{{ name }}</span>
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7"
              title="Adicionar slot"
              @click="addSlot(idx)"
            >
              <Plus class="h-4 w-4" />
            </Button>
          </div>

          <div
            v-if="!slotsByDay[idx]?.length"
            class="rounded-md border border-dashed py-2 text-center text-xs text-muted-foreground"
          >
            Indisponível
          </div>

          <div
            v-for="entry in slotsByDay[idx]"
            :key="`${idx}-${entry.index}`"
            class="flex items-center gap-1.5"
          >
            <Input
              v-model="entry.slot.start_time"
              type="time"
              class="h-8 flex-1 text-xs"
            />
            <span class="text-xs text-muted-foreground">→</span>
            <Input
              v-model="entry.slot.end_time"
              type="time"
              class="h-8 flex-1 text-xs"
            />
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7 text-destructive"
              title="Remover"
              @click="removeSlot(entry.index)"
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="mb-3 flex items-center gap-2">
        <CalendarOff class="h-4 w-4 text-muted-foreground" />
        <h4 class="font-semibold">Exceções (bloqueios e overrides)</h4>
      </div>

      <div class="grid gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_1.5fr_auto] mb-4">
        <div class="space-y-1">
          <Label class="text-xs">Data</Label>
          <Input v-model="newExcecao.data" type="date" />
        </div>
        <div class="space-y-1">
          <Label class="text-xs">Tipo</Label>
          <Select v-model="newExcecao.kind">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bloqueio">Bloqueio</SelectItem>
              <SelectItem value="override">Override</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1">
          <Label class="text-xs">Início</Label>
          <Input
            v-model="newExcecao.start_time"
            type="time"
            :disabled="newExcecao.kind === 'bloqueio'"
          />
        </div>
        <div class="space-y-1">
          <Label class="text-xs">Fim</Label>
          <Input
            v-model="newExcecao.end_time"
            type="time"
            :disabled="newExcecao.kind === 'bloqueio'"
          />
        </div>
        <div class="space-y-1">
          <Label class="text-xs">Motivo</Label>
          <Input v-model="newExcecao.motivo" placeholder="Opcional" />
        </div>
        <div class="flex items-end">
          <Button class="h-10 w-full md:w-auto" @click="onAddExcecao">
            <Plus class="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </div>

      <div
        v-if="!excecoes.length"
        class="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground"
      >
        Nenhuma exceção cadastrada
      </div>

      <ul v-else class="divide-y">
        <li
          v-for="ex in excecoes"
          :key="ex.id"
          class="grid grid-cols-[100px_100px_1fr_auto] items-center gap-3 py-2 text-sm"
        >
          <span class="font-medium">{{ fmtDate(ex.data) }}</span>
          <span
            class="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium"
            :class="ex.kind === 'bloqueio'
              ? 'bg-red-500/15 text-red-300'
              : 'bg-blue-500/15 text-blue-300'"
          >
            {{ ex.kind === 'bloqueio' ? 'Bloqueio' : 'Override' }}
          </span>
          <span class="text-muted-foreground">
            <template v-if="ex.kind === 'override'">
              {{ (ex.start_time ?? '').slice(0, 5) }} → {{ (ex.end_time ?? '').slice(0, 5) }}
              <span v-if="ex.motivo"> · {{ ex.motivo }}</span>
            </template>
            <template v-else>
              {{ ex.motivo ?? 'Dia inteiro indisponível' }}
            </template>
          </span>
          <Button
            variant="ghost"
            size="icon"
            class="text-destructive"
            title="Remover"
            @click="onDeleteExcecao(ex.id)"
          >
            <Trash2 class="h-4 w-4" />
          </Button>
        </li>
      </ul>
    </Card>
  </div>
</template>
