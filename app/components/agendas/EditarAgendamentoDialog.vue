<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import { Loader2, X, Plus } from 'lucide-vue-next'
import type { Database } from '~~/types/database'
import type { AttendeeInput, AgendamentoWithLead } from '~/composables/useAgendamentos'

const props = defineProps<{
  agendamento: AgendamentoWithLead | null
}>()

const open = defineModel<boolean>('open', { default: false })

const { leads } = useLeads()
const { updateEvent } = useAgendamentos()

const form = reactive({
  title: '',
  description: '',
  location: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  lead_id: '' as string,
})

const attendees = ref<AttendeeInput[]>([])
const newEmail = ref('')
const newName = ref('')

const saving = ref(false)
const errorMsg = ref('')

const tz = computed(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo')

function pad(n: number) { return String(n).padStart(2, '0') }
function splitIso(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: '', time: '' }
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

watch([open, () => props.agendamento], async ([isOpen, ag]) => {
  if (!isOpen || !ag) return
  form.title = ag.gg_title ?? ''
  form.description = ag.description ?? ''
  form.location = ag.location ?? ''
  const s = splitIso(ag.gg_start)
  const e = splitIso(ag.gg_end)
  form.startDate = s.date
  form.startTime = s.time
  form.endDate = e.date
  form.endTime = e.time
  form.lead_id = ag.lead_id ? String(ag.lead_id) : ''
  errorMsg.value = ''
  newEmail.value = ''
  newName.value = ''

  // Carrega attendees do banco
  const supa = useSupabaseClient<Database>()
  const { data } = await supa
    .from('agendamento_attendees')
    .select('email, display_name, lead_id')
    .eq('agendamento_id', ag.id)
  attendees.value = (data ?? []).map((a) => ({
    email: a.email,
    display_name: a.display_name ?? null,
    lead_id: a.lead_id ?? null,
  }))
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

function buildIso(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)
  const dt = new Date(y!, m! - 1, d!, hh!, mm!, 0)
  const off = -dt.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const abs = Math.abs(off)
  const oh = String(Math.floor(abs / 60)).padStart(2, '0')
  const om = String(abs % 60).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00${sign}${oh}:${om}`
}

async function submit() {
  if (!props.agendamento) return
  errorMsg.value = ''
  if (!form.title.trim()) {
    errorMsg.value = 'Informe o título.'
    return
  }
  if (!form.startDate || !form.startTime || !form.endDate || !form.endTime) {
    errorMsg.value = 'Informe data e hora de início e fim.'
    return
  }
  const startIso = buildIso(form.startDate, form.startTime)
  const endIso = buildIso(form.endDate, form.endTime)
  if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
    errorMsg.value = 'Fim deve ser posterior ao início.'
    return
  }

  saving.value = true
  try {
    await updateEvent(props.agendamento.id, {
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      start: startIso,
      end: endIso,
      timezone: tz.value,
      attendees: attendees.value,
      lead_id: form.lead_id ? Number(form.lead_id) : null,
    })
    open.value = false
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : 'Falha ao atualizar agendamento.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Editar agendamento</DialogTitle>
        <DialogDescription>
          As alterações são sincronizadas com o Google Calendar e os convidados são notificados.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="submit">
        <div class="space-y-1.5">
          <Label for="ed-title">Título <span class="text-destructive">*</span></Label>
          <Input id="ed-title" v-model="form.title" />
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-1.5">
            <Label>Início <span class="text-destructive">*</span></Label>
            <div class="flex gap-2">
              <Input v-model="form.startDate" type="date" class="flex-1" />
              <Input v-model="form.startTime" type="time" class="w-32" />
            </div>
          </div>
          <div class="space-y-1.5">
            <Label>Fim <span class="text-destructive">*</span></Label>
            <div class="flex gap-2">
              <Input v-model="form.endDate" type="date" class="flex-1" />
              <Input v-model="form.endTime" type="time" class="w-32" />
            </div>
          </div>
        </div>

        <div class="space-y-1.5">
          <Label for="ed-location">Local</Label>
          <Input id="ed-location" v-model="form.location" />
        </div>

        <div class="space-y-1.5">
          <Label for="ed-desc">Descrição</Label>
          <textarea
            id="ed-desc"
            v-model="form.description"
            rows="3"
            class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div class="space-y-1.5">
          <Label for="ed-lead">Lead vinculado</Label>
          <Select v-model="form.lead_id">
            <SelectTrigger id="ed-lead">
              <SelectValue placeholder="Selecione (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="l in leads ?? []"
                :key="l.id"
                :value="String(l.id)"
              >
                {{ l.nome_lead ?? `Lead #${l.id}` }}
              </SelectItem>
            </SelectContent>
          </Select>
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
            Salvar alterações
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
