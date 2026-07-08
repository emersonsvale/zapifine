<script setup lang="ts">
import { reactive, ref, watch, computed, nextTick } from 'vue'
import { Loader2, X, Plus } from 'lucide-vue-next'
import type { AttendeeInput, CreateEventError } from '~/composables/useAgendamentos'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  prefillLeadId?: number | null
  prefillTitle?: string | null
  prefillDate?: string | null
}>()

export type AgendaCreatedData = {
  title: string
  start: string
  end: string
  durationHours: string
  description: string | null
  location: string | null
  meetLink: string | null
  googleLink: string | null
}

const emit = defineEmits<{
  created: [data: AgendaCreatedData]
}>()

const { leads } = useLeads()
const { createEvent } = useAgendamentos()
const { confirm: confirmDialog } = useAlerts()

const scopeMe = computed<'me'>(() => 'me')
const { integrations: myIntegs } = useGoogleIntegrations(scopeMe)

const writableCalendars = computed(() => {
  const out: Array<{ id: string; label: string; is_default: boolean }> = []
  for (const integ of myIntegs.value ?? []) {
    for (const cal of integ.calendars) {
      if (!cal.selected) continue
      if (cal.access_role !== 'owner' && cal.access_role !== 'writer') continue
      out.push({
        id: cal.id,
        label: `${cal.summary ?? cal.gg_calendar_id}${integ.gg_email ? ` · ${integ.gg_email}` : ''}`,
        is_default: cal.default_write,
      })
    }
  }
  return out
})

const form = reactive({
  title: '',
  description: '',
  location: '',
  startDate: '',
  startTime: '',
  durationHours: '1',
  with_meet: false,
  lead_id: '' as string,
  google_calendar_id: '' as string,
})

const attendees = ref<AttendeeInput[]>([])
const newEmail = ref('')
const newName = ref('')

const saving = ref(false)
const errorMsg = ref('')

const tz = computed(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo')

watch(open, (v) => {
  if (!v) return
  form.title = props.prefillTitle ?? ''
  form.description = ''
  form.location = ''
  form.startDate = props.prefillDate ?? ''
  form.startTime = props.prefillDate ? '09:00' : ''
  form.durationHours = '1'
  form.with_meet = false
  form.lead_id = ''
  form.google_calendar_id = writableCalendars.value.find((c) => c.is_default)?.id ?? ''
  attendees.value = []
  newEmail.value = ''
  newName.value = ''
  errorMsg.value = ''
  if (props.prefillLeadId) {
    const id = String(props.prefillLeadId)
    nextTick(() => {
      form.lead_id = id
    })
  }
})

watch(() => form.lead_id, (val) => {
  if (!val) return
  const lead = leads.value?.find((l) => String(l.id) === val)
  if (!lead) return
  const email = lead['e-mail']?.trim()
  if (!email) return
  if (attendees.value.some((a) => a.email.toLowerCase() === email.toLowerCase())) return
  attendees.value.push({
    email,
    display_name: lead.nome_lead ?? null,
    lead_id: lead.id,
  })
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function addManualAttendee() {
  const email = newEmail.value.trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    errorMsg.value = 'E-mail inválido.'
    return
  }
  if (attendees.value.some((a) => a.email === email)) {
    newEmail.value = ''
    newName.value = ''
    return
  }
  attendees.value.push({ email, display_name: newName.value.trim() || null })
  newEmail.value = ''
  newName.value = ''
  errorMsg.value = ''
}

function removeAttendee(idx: number) {
  attendees.value.splice(idx, 1)
}

function buildIso(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)
  const dt = new Date(y!, m! - 1, d!, hh!, mm!, 0)
  // Local time → ISO with offset
  const off = -dt.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const abs = Math.abs(off)
  const oh = String(Math.floor(abs / 60)).padStart(2, '0')
  const om = String(abs % 60).padStart(2, '0')
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00${sign}${oh}:${om}`
}

async function submit() {
  errorMsg.value = ''
  if (!form.title.trim()) {
    errorMsg.value = 'Informe o título.'
    return
  }
  if (!form.startDate || !form.startTime) {
    errorMsg.value = 'Informe data e hora de início.'
    return
  }
  const hours = Number(form.durationHours)
  if (!hours || hours <= 0) {
    errorMsg.value = 'Duração inválida.'
    return
  }

  const startIso = buildIso(form.startDate, form.startTime)
  const startMs = new Date(startIso).getTime()
  if (startMs <= Date.now()) {
    errorMsg.value = 'A data/hora de início precisa ser futura.'
    return
  }
  const endIso = new Date(startMs + hours * 60 * 60 * 1000).toISOString()

  saving.value = true
  try {
    await tryCreate(false)
    open.value = false
  } catch (err) {
    const e = err as CreateEventError
    if (e.code === 'OUTSIDE_AVAILABILITY') {
      const ok = await confirmDialog({
        title: 'Fora da disponibilidade',
        description: `${e.reason ?? e.message}\n\nDeseja criar mesmo assim?`,
        confirmLabel: 'Criar mesmo assim',
        variant: 'danger',
      })
      if (ok) {
        try {
          await tryCreate(true)
          open.value = false
        } catch (err2) {
          errorMsg.value = err2 instanceof Error ? err2.message : 'Falha ao criar.'
        } finally {
          saving.value = false
        }
        return
      }
    }
    errorMsg.value = e instanceof Error ? e.message : 'Falha ao criar agendamento.'
  } finally {
    saving.value = false
  }

  async function tryCreate(force: boolean) {
    const result = await createEvent({
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      start: startIso,
      end: endIso,
      timezone: tz.value,
      with_meet: form.with_meet,
      attendees: attendees.value,
      lead_id: form.lead_id ? Number(form.lead_id) : null,
      google_calendar_id: form.google_calendar_id || null,
      force_outside_availability: force,
    })
    emit('created', {
      title: form.title.trim(),
      start: startIso,
      end: endIso,
      durationHours: form.durationHours,
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      meetLink: result.meetLink ?? null,
      googleLink: result.link ?? null,
    })
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Novo agendamento</DialogTitle>
        <DialogDescription>
          Cria um evento no Google Calendar da empresa e notifica os convidados.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="submit">
        <div class="space-y-1.5">
          <Label for="ag-title">Título <span class="text-destructive">*</span></Label>
          <Input
            id="ag-title"
            v-model="form.title"
            placeholder="Reunião com cliente"
          />
        </div>

        <div class="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
          <div class="space-y-1.5">
            <Label for="ag-date">Data de início <span class="text-destructive">*</span></Label>
            <Input id="ag-date" v-model="form.startDate" type="date" />
          </div>
          <div class="space-y-1.5">
            <Label for="ag-time">Hora <span class="text-destructive">*</span></Label>
            <Input id="ag-time" v-model="form.startTime" type="time" />
          </div>
          <div class="space-y-1.5">
            <Label for="ag-dur">Duração (h) <span class="text-destructive">*</span></Label>
            <Select v-model="form.durationHours">
              <SelectTrigger id="ag-dur">
                <SelectValue placeholder="1" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">30 min</SelectItem>
                <SelectItem value="1">1 hora</SelectItem>
                <SelectItem value="1.5">1h30</SelectItem>
                <SelectItem value="2">2 horas</SelectItem>
                <SelectItem value="3">3 horas</SelectItem>
                <SelectItem value="4">4 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div v-if="writableCalendars.length > 1" class="space-y-1.5">
          <Label for="ag-calendar">Calendário destino</Label>
          <Select v-model="form.google_calendar_id">
            <SelectTrigger id="ag-calendar">
              <SelectValue placeholder="Padrão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="c in writableCalendars"
                :key="c.id"
                :value="c.id"
              >
                {{ c.label }}
                <span v-if="c.is_default" class="text-xs text-amber-400"> ★</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-1.5">
          <Label for="ag-location">Local</Label>
          <Input
            id="ag-location"
            v-model="form.location"
            placeholder="Endereço, sala ou link"
          />
        </div>

        <div class="space-y-1.5">
          <Label for="ag-desc">Descrição</Label>
          <textarea
            id="ag-desc"
            v-model="form.description"
            rows="3"
            placeholder="Notas, pauta, instruções"
            class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div class="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2">
          <input
            id="ag-meet"
            v-model="form.with_meet"
            type="checkbox"
            class="h-4 w-4 accent-primary"
          />
          <label for="ag-meet" class="text-sm cursor-pointer">
            Criar link do Google Meet automaticamente
          </label>
        </div>

        <div class="space-y-1.5">
          <Label for="ag-lead">Vincular a um lead</Label>
          <Select v-model="form.lead_id">
            <SelectTrigger id="ag-lead">
              <SelectValue placeholder="Selecione (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="l in leads ?? []"
                :key="l.id"
                :value="String(l.id)"
              >
                {{ l.nome_lead ?? `Lead #${l.id}` }}
                <span v-if="l['e-mail']" class="text-muted-foreground"> · {{ l['e-mail'] }}</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <p class="text-xs text-muted-foreground">
            Se o lead tiver e-mail, ele é adicionado automaticamente como convidado.
          </p>
        </div>

        <div class="space-y-2">
          <Label>Convidados</Label>
          <div v-if="attendees.length" class="flex flex-wrap gap-1.5">
            <span
              v-for="(a, i) in attendees"
              :key="a.email"
              class="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-1 text-xs"
            >
              <span>{{ a.display_name ?? a.email }}</span>
              <span v-if="a.display_name" class="text-muted-foreground">· {{ a.email }}</span>
              <button
                type="button"
                class="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20"
                @click="removeAttendee(i)"
              >
                <X class="h-3 w-3" />
              </button>
            </span>
          </div>
          <div class="grid gap-2 md:grid-cols-[1.5fr_1fr_auto]">
            <Input
              v-model="newEmail"
              type="email"
              placeholder="email@dominio.com"
              @keydown.enter.prevent="addManualAttendee"
            />
            <Input
              v-model="newName"
              placeholder="Nome (opcional)"
              @keydown.enter.prevent="addManualAttendee"
            />
            <Button type="button" variant="outline" @click="addManualAttendee">
              <Plus class="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>

        <p
          v-if="errorMsg"
          class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {{ errorMsg }}
        </p>

        <DialogFooter>
          <Button variant="outline" type="button" @click="open = false">
            Cancelar
          </Button>
          <Button type="submit" :disabled="saving">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            Salvar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
