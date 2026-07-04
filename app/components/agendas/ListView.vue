<script setup lang="ts">
import { computed } from 'vue'
import {
  Calendar,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next'
import type { AgendamentoWithLead } from '~/composables/useAgendamentos'

const props = defineProps<{
  agendamentos: AgendamentoWithLead[]
  loading: boolean
}>()

const cursor = defineModel<Date>('cursor', { required: true })

const emit = defineEmits<{
  (e: 'confirm', ag: AgendamentoWithLead): void
  (e: 'cancel', ag: AgendamentoWithLead): void
  (e: 'edit', ag: AgendamentoWithLead): void
}>()

const mesNome = computed(() =>
  new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(cursor.value),
)

const agendamentosDoMes = computed(() => {
  const y = cursor.value.getFullYear()
  const m = cursor.value.getMonth()
  return props.agendamentos.filter((a) => {
    if (!a.gg_start) return false
    const d = new Date(a.gg_start)
    if (Number.isNaN(d.getTime())) return false
    return d.getFullYear() === y && d.getMonth() === m
  })
})

function prev() {
  const d = new Date(cursor.value)
  d.setMonth(d.getMonth() - 1)
  cursor.value = d
}
function next() {
  const d = new Date(cursor.value)
  d.setMonth(d.getMonth() + 1)
  cursor.value = d
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '00/00/0000'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '00/00/0000'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusClass(ag: AgendamentoWithLead) {
  if (ag.is_external) return 'bg-sky-500/15 text-sky-300'
  if (ag.status_agenda === 'Confirmado') return 'bg-emerald-500/15 text-emerald-300'
  if (ag.status_agenda === 'Cancelado') return 'bg-red-500/15 text-red-300'
  return 'bg-amber-500/15 text-amber-300'
}

function statusLabel(ag: AgendamentoWithLead) {
  if (ag.is_external) return 'Google'
  return ag.status_agenda ?? 'Pendente'
}
</script>

<template>
  <Card class="overflow-hidden p-0">
    <div class="flex items-center justify-between border-b px-4 py-3">
      <Button variant="ghost" size="icon" @click="prev">
        <ChevronLeft class="h-4 w-4" />
      </Button>
      <p class="text-xl font-semibold capitalize">{{ mesNome }}</p>
      <Button variant="ghost" size="icon" @click="next">
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>

    <div
      class="grid grid-cols-[1.1fr_1.1fr_2fr_1fr_160px] gap-3 border-b bg-muted/20 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
    >
      <span>Data/Hora Início</span>
      <span>Data/Hora Fim</span>
      <span>Título</span>
      <span>Status</span>
      <span class="text-right">Ações</span>
    </div>

    <div
      v-if="loading"
      class="py-12 text-center text-sm text-muted-foreground"
    >
      Carregando...
    </div>

    <div
      v-else-if="!agendamentosDoMes.length"
      class="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground"
    >
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40">
        <ZapifineLogo :size="28" />
      </div>
      Não há nada por aqui
    </div>

    <ul v-else class="divide-y">
      <li
        v-for="ag in agendamentosDoMes"
        :key="ag.id"
        class="grid grid-cols-[1.1fr_1.1fr_2fr_1fr_160px] items-center gap-3 px-5 py-3 text-sm"
      >
        <span class="flex items-center gap-2">
          <Calendar class="h-4 w-4 text-muted-foreground" />
          {{ fmtDateTime(ag.gg_start) }}
        </span>
        <span class="flex items-center gap-2">
          <Calendar class="h-4 w-4 text-muted-foreground" />
          {{ fmtDateTime(ag.gg_end) }}
        </span>
        <span class="truncate">{{ ag.gg_title ?? '—' }}</span>
        <span>
          <span
            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            :class="statusClass(ag)"
          >
            {{ statusLabel(ag) }}
          </span>
        </span>
        <div class="flex items-center justify-end gap-1">
          <Button
            v-if="ag.gg_link"
            variant="ghost"
            size="icon"
            as-child
            title="Abrir no Google"
          >
            <a :href="ag.gg_link" target="_blank" rel="noopener">
              <ExternalLink class="h-4 w-4" />
            </a>
          </Button>
          <template v-if="!ag.is_external">
            <Button
              v-if="ag.status_agenda !== 'Cancelado'"
              variant="ghost"
              size="icon"
              title="Editar"
              @click="emit('edit', ag)"
            >
              <Pencil class="h-4 w-4" />
            </Button>
            <Button
              v-if="
                ag.status_agenda !== 'Confirmado' &&
                ag.status_agenda !== 'Cancelado'
              "
              variant="ghost"
              size="icon"
              title="Confirmar"
              @click="emit('confirm', ag)"
            >
              <CheckCircle2 class="h-4 w-4 text-emerald-400" />
            </Button>
            <Button
              v-if="ag.status_agenda !== 'Cancelado'"
              variant="ghost"
              size="icon"
              title="Cancelar"
              @click="emit('cancel', ag)"
            >
              <Trash2 class="h-4 w-4 text-destructive" />
            </Button>
          </template>
        </div>
      </li>
    </ul>
  </Card>
</template>
