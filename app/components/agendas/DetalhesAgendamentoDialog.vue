<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Calendar as CalIcon,
  Clock,
  MapPin,
  FileText,
  User,
  Users,
  Video,
  ExternalLink,
  Pencil,
  CheckCircle2,
  Trash2,
} from 'lucide-vue-next'
import type { Database } from '~~/types/database'
import type { AgendamentoWithLead } from '~/composables/useAgendamentos'

const props = defineProps<{
  agendamento: AgendamentoWithLead | null
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  (e: 'edit', ag: AgendamentoWithLead): void
  (e: 'confirm', ag: AgendamentoWithLead): void
  (e: 'cancel', ag: AgendamentoWithLead): void
}>()

const supabase = useSupabaseClient<Database>()
const attendees = ref<Array<{ email: string; display_name: string | null }>>([])

watch([open, () => props.agendamento], async ([isOpen, ag]) => {
  if (!isOpen || !ag) {
    attendees.value = []
    return
  }
  const { data } = await supabase
    .from('agendamento_attendees')
    .select('email, display_name')
    .eq('agendamento_id', ag.id)
  attendees.value = (data ?? []).map((a) => ({
    email: a.email,
    display_name: a.display_name ?? null,
  }))
})

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtRange(startIso: string | null, endIso: string | null) {
  if (!startIso || !endIso) return fmtDateTime(startIso)
  const s = new Date(startIso)
  const e = new Date(endIso)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return fmtDateTime(startIso)
  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate()
  const timeFmt: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  if (sameDay) {
    return `${fmtDateTime(startIso)} — ${e.toLocaleTimeString('pt-BR', timeFmt)}`
  }
  return `${fmtDateTime(startIso)} — ${fmtDateTime(endIso)}`
}

const statusInfo = computed(() => {
  const ag = props.agendamento
  if (!ag) return { label: '—', cls: 'bg-muted/40 text-muted-foreground' }
  if (ag.is_external) return { label: 'Google Calendar', cls: 'bg-sky-500/15 text-sky-300' }
  if (ag.status_agenda === 'Confirmado') return { label: 'Confirmado', cls: 'bg-emerald-500/15 text-emerald-300' }
  if (ag.status_agenda === 'Cancelado') return { label: 'Cancelado', cls: 'bg-red-500/15 text-red-300' }
  return { label: ag.status_agenda ?? 'Pendente', cls: 'bg-amber-500/15 text-amber-300' }
})

const canEdit = computed(
  () => props.agendamento && !props.agendamento.is_external && props.agendamento.status_agenda !== 'Cancelado',
)
const canConfirm = computed(
  () =>
    props.agendamento &&
    !props.agendamento.is_external &&
    props.agendamento.status_agenda !== 'Confirmado' &&
    props.agendamento.status_agenda !== 'Cancelado',
)
const canCancel = computed(
  () => props.agendamento && !props.agendamento.is_external && props.agendamento.status_agenda !== 'Cancelado',
)

type DescPart = { type: 'text' | 'link'; value: string }

const URL_RE = /(https?:\/\/[^\s<>]+)/g

function stripTrailingPunct(url: string): { url: string; trail: string } {
  const m = url.match(/[.,;:!?)\]]+$/)
  if (!m) return { url, trail: '' }
  return { url: url.slice(0, -m[0].length), trail: m[0] }
}

const descriptionParts = computed<DescPart[]>(() => {
  const raw = props.agendamento?.description ?? ''
  if (!raw) return []
  const out: DescPart[] = []
  let lastIdx = 0
  for (const m of raw.matchAll(URL_RE)) {
    const idx = m.index ?? 0
    if (idx > lastIdx) out.push({ type: 'text', value: raw.slice(lastIdx, idx) })
    const { url, trail } = stripTrailingPunct(m[0])
    out.push({ type: 'link', value: url })
    if (trail) out.push({ type: 'text', value: trail })
    lastIdx = idx + m[0].length
  }
  if (lastIdx < raw.length) out.push({ type: 'text', value: raw.slice(lastIdx) })
  return out
})

function onEdit() {
  if (!props.agendamento) return
  emit('edit', props.agendamento)
  open.value = false
}

function onConfirm() {
  if (!props.agendamento) return
  emit('confirm', props.agendamento)
  open.value = false
}

function onCancel() {
  if (!props.agendamento) return
  emit('cancel', props.agendamento)
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="flex max-h-[90vh] flex-col sm:max-w-xl">
      <DialogHeader>
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 space-y-1">
            <DialogTitle class="break-words text-xl">
              {{ agendamento?.gg_title ?? 'Agendamento' }}
            </DialogTitle>
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              :class="statusInfo.cls"
            >
              {{ statusInfo.label }}
            </span>
          </div>
        </div>
      </DialogHeader>

      <div v-if="agendamento" class="min-w-0 flex-1 space-y-4 overflow-y-auto pr-1 text-sm">
        <div class="flex items-start gap-3">
          <Clock class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div class="capitalize">{{ fmtRange(agendamento.gg_start, agendamento.gg_end) }}</div>
        </div>

        <div v-if="agendamento.source_calendar?.summary" class="flex items-start gap-3">
          <CalIcon class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div class="flex items-center gap-2">
            <span
              v-if="agendamento.source_calendar.color_hex"
              class="h-2.5 w-2.5 rounded-full"
              :style="`background:${agendamento.source_calendar.color_hex}`"
            />
            {{ agendamento.source_calendar.summary }}
          </div>
        </div>

        <div v-if="agendamento.location" class="flex items-start gap-3">
          <MapPin class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div class="min-w-0 break-words">{{ agendamento.location }}</div>
        </div>

        <div v-if="agendamento.lead" class="flex items-start gap-3">
          <User class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div class="min-w-0 break-words">
            {{ agendamento.lead.nome_lead ?? `Lead #${agendamento.lead.id}` }}
            <span v-if="agendamento.lead['e-mail']" class="text-muted-foreground">
              · {{ agendamento.lead['e-mail'] }}
            </span>
          </div>
        </div>

        <div v-if="attendees.length" class="flex items-start gap-3">
          <Users class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="a in attendees"
              :key="a.email"
              class="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-1 text-xs"
              :title="a.email"
            >
              {{ a.display_name ?? a.email }}
            </span>
          </div>
        </div>

        <div v-if="agendamento.description" class="flex items-start gap-3">
          <FileText class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div class="min-w-0 flex-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            <template v-for="(p, i) in descriptionParts" :key="i">
              <a
                v-if="p.type === 'link'"
                :href="p.value"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sky-400 underline underline-offset-2 hover:text-sky-300"
              >{{ p.value }}</a>
              <template v-else>{{ p.value }}</template>
            </template>
          </div>
        </div>

        <div
          v-if="agendamento.meet_link || agendamento.gg_link"
          class="flex flex-wrap gap-2 border-t pt-4"
        >
          <Button v-if="agendamento.meet_link" as-child variant="default">
            <a :href="agendamento.meet_link" target="_blank" rel="noopener">
              <Video class="h-4 w-4" />
              Entrar no Google Meet
            </a>
          </Button>
          <Button v-if="agendamento.gg_link" as-child variant="outline">
            <a :href="agendamento.gg_link" target="_blank" rel="noopener">
              <ExternalLink class="h-4 w-4" />
              Abrir no Google Calendar
            </a>
          </Button>
        </div>
      </div>

      <DialogFooter class="gap-2 sm:justify-between">
        <div class="flex flex-wrap gap-2">
          <Button v-if="canEdit" variant="outline" @click="onEdit">
            <Pencil class="h-4 w-4" />
            Editar
          </Button>
          <Button v-if="canConfirm" variant="outline" @click="onConfirm">
            <CheckCircle2 class="h-4 w-4 text-emerald-400" />
            Confirmar
          </Button>
          <Button v-if="canCancel" variant="outline" @click="onCancel">
            <Trash2 class="h-4 w-4 text-destructive" />
            Cancelar
          </Button>
        </div>
        <Button variant="ghost" @click="open = false">Fechar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
