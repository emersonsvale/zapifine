<script setup lang="ts">
import { computed } from 'vue'
import { Plus, CalendarDays } from 'lucide-vue-next'
import type { AgendamentoWithLead } from '~/composables/useAgendamentos'

const props = defineProps<{
  ymd: string | null
  agendamentos: AgendamentoWithLead[]
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  (e: 'select', ag: AgendamentoWithLead): void
  (e: 'new', ymd: string): void
}>()

const dateLabel = computed(() => {
  if (!props.ymd) return ''
  const [y, m, d] = props.ymd.split('-').map(Number)
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1)
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(dt)
})

const sorted = computed(() =>
  [...props.agendamentos].sort((a, b) => {
    const ta = a.gg_start ? new Date(a.gg_start).getTime() : 0
    const tb = b.gg_start ? new Date(b.gg_start).getTime() : 0
    return ta - tb
  }),
)

function timeLabel(iso: string | null | undefined) {
  if (!iso) return '--:--'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--:--'
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function statusInfo(ev: AgendamentoWithLead) {
  if (ev.is_external) return { dot: 'bg-sky-400', label: 'Google Calendar', cls: 'bg-sky-500/15 text-sky-300' }
  if (ev.status_agenda === 'Confirmado') return { dot: 'bg-emerald-400', label: 'Confirmado', cls: 'bg-emerald-500/15 text-emerald-300' }
  if (ev.status_agenda === 'Cancelado') return { dot: 'bg-red-400', label: 'Cancelado', cls: 'bg-red-500/15 text-red-300' }
  return { dot: 'bg-amber-400', label: ev.status_agenda ?? 'Pendente', cls: 'bg-amber-500/15 text-amber-300' }
}

function onPick(ag: AgendamentoWithLead) {
  emit('select', ag)
  open.value = false
}

function onNew() {
  if (!props.ymd) return
  emit('new', props.ymd)
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="flex max-h-[85vh] flex-col sm:max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2 capitalize">
          <CalendarDays class="h-5 w-5 text-muted-foreground" />
          {{ dateLabel }}
        </DialogTitle>
        <DialogDescription>
          {{ sorted.length }} agendamento{{ sorted.length === 1 ? '' : 's' }} neste dia.
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        <button
          v-for="ev in sorted"
          :key="ev.id"
          type="button"
          class="flex w-full items-start gap-3 rounded-md border border-border/60 bg-card p-3 text-left transition hover:bg-accent/20"
          @click="onPick(ev)"
        >
          <div class="flex w-14 shrink-0 flex-col text-xs">
            <span class="font-semibold">{{ timeLabel(ev.gg_start) }}</span>
            <span class="text-muted-foreground">{{ timeLabel(ev.gg_end) }}</span>
          </div>
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 shrink-0 rounded-full" :class="statusInfo(ev).dot" />
              <span class="truncate text-sm font-medium">
                {{ ev.gg_title ?? 'Sem título' }}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span
                class="inline-flex items-center rounded-full px-1.5 py-0.5 font-medium"
                :class="statusInfo(ev).cls"
              >
                {{ statusInfo(ev).label }}
              </span>
              <span v-if="ev.lead?.nome_lead" class="text-muted-foreground truncate">
                · {{ ev.lead.nome_lead }}
              </span>
              <span v-if="ev.source_calendar?.summary" class="text-muted-foreground truncate">
                · {{ ev.source_calendar.summary }}
              </span>
            </div>
          </div>
        </button>

        <div
          v-if="!sorted.length"
          class="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground"
        >
          Nenhum agendamento neste dia.
        </div>
      </div>

      <DialogFooter class="gap-2 sm:justify-between">
        <Button variant="ghost" @click="open = false">Fechar</Button>
        <Button @click="onNew">
          <Plus class="h-4 w-4" />
          Novo agendamento
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
