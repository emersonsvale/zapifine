<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Lead = Database['public']['Tables']['leads']['Row']

const open = defineModel<boolean>('open', { default: false })

const { leads } = useLeads()
const { createEvent } = useAgendamentos()

const form = reactive({
  title: '',
  startDate: '',
  startTime: '',
  durationHours: '1',
  lead_id: '' as string,
  guest_email: '',
})

const saving = ref(false)
const errorMsg = ref('')

watch(open, (v) => {
  if (!v) return
  form.title = ''
  form.startDate = ''
  form.startTime = ''
  form.durationHours = '1'
  form.lead_id = ''
  form.guest_email = ''
  errorMsg.value = ''
})

const leadSelecionado = computed<Lead | null>(() => {
  if (!form.lead_id) return null
  return leads.value?.find((l) => String(l.id) === form.lead_id) ?? null
})

watch(leadSelecionado, (l) => {
  if (l?.['e-mail']) form.guest_email = l['e-mail']
})

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toDdMmYyyyHHmm(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y} ${timeStr}`
}

function addHours(dateStr: string, timeStr: string, hours: number) {
  const [y = 2000, m = 1, d = 1] = dateStr.split('-').map(Number)
  const [hh = 0, mm = 0] = timeStr.split(':').map(Number)
  const dt = new Date(y, m - 1, d, hh, mm)
  dt.setMinutes(dt.getMinutes() + Math.round(hours * 60))
  const y2 = dt.getFullYear()
  const m2 = pad(dt.getMonth() + 1)
  const d2 = pad(dt.getDate())
  const h2 = pad(dt.getHours())
  const min2 = pad(dt.getMinutes())
  return `${d2}/${m2}/${y2} ${h2}:${min2}`
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

  const startFmt = toDdMmYyyyHHmm(form.startDate, form.startTime)
  const endFmt = addHours(form.startDate, form.startTime, hours)

  saving.value = true
  try {
    await createEvent({
      title: form.title.trim(),
      start: startFmt,
      end: endFmt,
      guest_email: form.guest_email.trim() || null,
      lead_id: form.lead_id ? Number(form.lead_id) : null,
    })
    open.value = false
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : 'Falha ao criar agendamento.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Novo agendamento</DialogTitle>
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

        <div class="space-y-1.5">
          <Label for="ag-lead">Lead</Label>
          <Select v-model="form.lead_id">
            <SelectTrigger id="ag-lead">
              <SelectValue placeholder="Selecione um lead (opcional)" />
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

        <div class="space-y-1.5">
          <Label for="ag-email">E-mail do convidado</Label>
          <Input
            id="ag-email"
            v-model="form.guest_email"
            type="email"
            placeholder="convidado@email.com"
          />
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
