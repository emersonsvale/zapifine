<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { AgendamentoWithLead } from '~/composables/useAgendamentos'

const props = defineProps<{
  agendamentos: AgendamentoWithLead[]
}>()

const emit = defineEmits<{
  (e: 'select', ag: AgendamentoWithLead): void
  (e: 'day', iso: string): void
}>()

const cursor = ref(new Date())

const mesNome = computed(() =>
  new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(cursor.value),
)

function startGrid(ref: Date) {
  const first = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const weekday = (first.getDay() + 6) % 7
  first.setDate(first.getDate() - weekday)
  return first
}

const grid = computed(() => {
  const out: Date[] = []
  const start = startGrid(cursor.value)
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    out.push(d)
  }
  return out
})

const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isCurrentMonth(d: Date) {
  return d.getMonth() === cursor.value.getMonth()
}

const today = new Date()

function eventsForDay(d: Date) {
  return props.agendamentos.filter((a) => {
    if (!a.gg_start) return false
    const dt = new Date(a.gg_start)
    return !Number.isNaN(dt.getTime()) && sameDay(dt, d)
  })
}

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

function statusDot(ev: AgendamentoWithLead) {
  if (ev.is_external) return 'bg-sky-400'
  if (ev.status_agenda === 'Confirmado') return 'bg-emerald-400'
  if (ev.status_agenda === 'Cancelado') return 'bg-red-400'
  return 'bg-amber-400'
}

function onEventClick(ev: AgendamentoWithLead) {
  if (ev.is_external) {
    if (ev.gg_link) window.open(ev.gg_link, '_blank')
    return
  }
  emit('select', ev)
}

function timeLabel(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <Card class="overflow-hidden p-0">
    <div class="flex items-center justify-between px-4 py-3">
      <Button variant="ghost" size="icon" @click="prev">
        <ChevronLeft class="h-4 w-4" />
      </Button>
      <p class="text-xl font-semibold capitalize">{{ mesNome }}</p>
      <Button variant="ghost" size="icon" @click="next">
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>

    <div class="grid grid-cols-7 border-t border-border/60 text-xs font-medium text-muted-foreground">
      <div
        v-for="w in weekdays"
        :key="w"
        class="px-3 py-2 text-left"
      >
        {{ w }}
      </div>
    </div>

    <div class="grid grid-cols-7 gap-px bg-border/60 border-t border-border/60">
      <button
        v-for="d in grid"
        :key="d.toISOString()"
        type="button"
        class="relative flex min-h-[92px] flex-col bg-card p-2 text-left transition hover:bg-accent/20"
        :class="[
          sameDay(d, today)
            ? 'outline outline-2 -outline-offset-2 outline-emerald-500/80'
            : '',
        ]"
        @click="emit('day', d.toISOString())"
      >
        <span
          class="self-end text-xs font-semibold"
          :class="isCurrentMonth(d) ? 'text-foreground' : 'text-muted-foreground/50'"
        >
          {{ String(d.getDate()).padStart(2, '0') }}
        </span>

        <div class="mt-1 flex flex-col gap-0.5">
          <div
            v-for="ev in eventsForDay(d).slice(0, 3)"
            :key="ev.id"
            class="flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11px]"
            :class="ev.is_external ? 'bg-sky-500/10 border border-sky-500/30 text-sky-200/90' : 'bg-muted/40'"
            :title="ev.is_external ? `${ev.source_calendar?.summary ?? 'Google Calendar'} (somente leitura)` : undefined"
            @click.stop="onEventClick(ev)"
          >
            <span
              v-if="ev.source_calendar?.color_hex"
              class="h-1.5 w-1.5 shrink-0 rounded-full"
              :style="`background:${ev.source_calendar.color_hex}`"
            />
            <span
              v-else
              class="h-1.5 w-1.5 shrink-0 rounded-full"
              :class="statusDot(ev)"
            />
            <span class="truncate">
              <span class="font-semibold">{{ timeLabel(ev.gg_start) }}</span>
              {{ ev.gg_title ? `· ${ev.gg_title}` : '' }}
            </span>
          </div>
          <span
            v-if="eventsForDay(d).length > 3"
            class="text-[10px] text-muted-foreground"
          >
            +{{ eventsForDay(d).length - 3 }} mais
          </span>
        </div>
      </button>
    </div>
  </Card>
</template>
