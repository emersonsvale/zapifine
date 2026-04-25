<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from 'lucide-vue-next'

definePageMeta({ layout: false, auth: false })

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ''))

useHead({ title: 'Agendar horário' })

type Member = { id: string; nome: string | null; foto_perfil: string | null }
type CompanyMeta = {
  id: string
  name: string
  logo_url: string | null
  titulo: string | null
  descricao: string | null
}

const company = ref<CompanyMeta | null>(null)
const members = ref<Member[]>([])
const loadingMeta = ref(true)
const errorMsg = ref('')

const selectedUser = ref<string | null>(null)
const selectedDate = ref<string>('') // YYYY-MM-DD
const duration = ref(60)

const slots = ref<Array<{ start: string; end: string }>>([])
const loadingSlots = ref(false)
const selectedSlot = ref<{ start: string; end: string } | null>(null)

const guest = ref({ name: '', email: '', phone: '', notes: '' })
const submitting = ref(false)
const success = ref<{ when: string; link: string | null } | null>(null)

const tz = computed(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo')

function pad(n: number) { return String(n).padStart(2, '0') }
function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

onMounted(async () => {
  selectedDate.value = todayIso()
  await loadMeta()
})

async function loadMeta() {
  loadingMeta.value = true
  errorMsg.value = ''
  try {
    const res = await $fetch<{ company: CompanyMeta; members: Member[] }>(
      `/api/public/agendas/${encodeURIComponent(slug.value)}`,
    )
    company.value = res.company
    members.value = res.members
    if (res.members.length === 1) selectedUser.value = res.members[0]!.id
  } catch (err) {
    errorMsg.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
      ?? 'Agenda não encontrada.'
  } finally {
    loadingMeta.value = false
  }
}

async function loadSlots() {
  if (!selectedUser.value || !selectedDate.value) {
    slots.value = []
    return
  }
  loadingSlots.value = true
  selectedSlot.value = null
  try {
    const res = await $fetch<{ slots: Array<{ start: string; end: string }> }>(
      `/api/public/agendas/${encodeURIComponent(slug.value)}/slots`,
      { query: { user_id: selectedUser.value, date: selectedDate.value, duration: duration.value } },
    )
    slots.value = res.slots
  } catch (err) {
    slots.value = []
    errorMsg.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
      ?? 'Falha ao buscar horários.'
  } finally {
    loadingSlots.value = false
  }
}

watch([selectedUser, selectedDate, duration], () => {
  errorMsg.value = ''
  loadSlots()
})

function buildIso(timeStr: string): string {
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)
  const dt = new Date(y!, m! - 1, d!, hh!, mm!, 0)
  const off = -dt.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const abs = Math.abs(off)
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

function shiftDay(delta: number) {
  const d = new Date(`${selectedDate.value}T12:00:00`)
  d.setDate(d.getDate() + delta)
  selectedDate.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function onSubmit() {
  if (!selectedSlot.value || !selectedUser.value) {
    errorMsg.value = 'Selecione um horário.'
    return
  }
  if (!guest.value.name.trim()) {
    errorMsg.value = 'Informe seu nome.'
    return
  }
  if (!EMAIL_RE.test(guest.value.email.trim())) {
    errorMsg.value = 'E-mail inválido.'
    return
  }

  submitting.value = true
  errorMsg.value = ''
  try {
    const res = await $fetch<{ id: string; link: string | null; when: string }>(
      `/api/public/agendas/${encodeURIComponent(slug.value)}/book`,
      {
        method: 'POST',
        body: {
          user_id: selectedUser.value,
          start: buildIso(selectedSlot.value.start),
          end: buildIso(selectedSlot.value.end),
          timezone: tz.value,
          guest: guest.value,
        },
      },
    )
    success.value = { when: res.when, link: res.link }
  } catch (err) {
    errorMsg.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
      ?? (err instanceof Error ? err.message : 'Falha ao agendar.')
    await loadSlots() // pode ter sido tomado entre carregar e clicar
  } finally {
    submitting.value = false
  }
}

const fmtSelectedDate = computed(() => {
  if (!selectedDate.value) return ''
  const d = new Date(`${selectedDate.value}T12:00:00`)
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
})
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <div class="mx-auto max-w-3xl px-4 py-10">
      <!-- Loading meta -->
      <div v-if="loadingMeta" class="text-center py-20 text-muted-foreground">
        <Loader2 class="h-8 w-8 mx-auto animate-spin" />
        <p class="mt-3">Carregando...</p>
      </div>

      <!-- Erro fatal -->
      <div v-else-if="!company" class="text-center py-20">
        <p class="text-lg font-semibold">Agenda não encontrada</p>
        <p class="text-sm text-muted-foreground mt-2">{{ errorMsg }}</p>
      </div>

      <!-- Sucesso -->
      <Card v-else-if="success" class="p-8 text-center space-y-4">
        <CheckCircle2 class="h-16 w-16 mx-auto text-emerald-400" />
        <h1 class="text-2xl font-bold">Agendamento confirmado!</h1>
        <p class="text-muted-foreground">
          {{ new Date(success.when).toLocaleString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
          }) }}
        </p>
        <p class="text-sm text-muted-foreground">
          Você receberá um e-mail com os detalhes.
        </p>
        <Button v-if="success.link" as-child variant="outline">
          <a :href="success.link" target="_blank" rel="noopener">
            Ver no Google Calendar
          </a>
        </Button>
      </Card>

      <!-- Form principal -->
      <div v-else class="space-y-6">
        <!-- Header -->
        <div class="text-center space-y-2">
          <img
            v-if="company.logo_url"
            :src="company.logo_url"
            :alt="company.name"
            class="h-16 mx-auto"
          />
          <h1 class="text-3xl font-bold">
            {{ company.titulo ?? `Agendar com ${company.name}` }}
          </h1>
          <p v-if="company.descricao" class="text-muted-foreground">
            {{ company.descricao }}
          </p>
        </div>

        <!-- Atendente -->
        <Card v-if="members.length > 1" class="p-4">
          <Label class="mb-2 block">Atendente</Label>
          <Select v-model="selectedUser">
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="m in members" :key="m.id" :value="m.id">
                {{ m.nome ?? 'Atendente' }}
              </SelectItem>
            </SelectContent>
          </Select>
        </Card>

        <!-- Data + duração -->
        <Card class="p-4 space-y-3">
          <div class="flex items-center justify-between">
            <Button variant="ghost" size="icon" @click="shiftDay(-1)">
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <div class="text-center">
              <p class="text-sm text-muted-foreground">Data</p>
              <p class="font-semibold capitalize">{{ fmtSelectedDate }}</p>
            </div>
            <Button variant="ghost" size="icon" @click="shiftDay(1)">
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
          <div class="grid gap-2 md:grid-cols-2">
            <div class="space-y-1">
              <Label class="text-xs">Data específica</Label>
              <Input v-model="selectedDate" type="date" :min="todayIso()" />
            </div>
            <div class="space-y-1">
              <Label class="text-xs">Duração</Label>
              <Select v-model.number="duration">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem :value="30">30 min</SelectItem>
                  <SelectItem :value="60">1 hora</SelectItem>
                  <SelectItem :value="90">1h30</SelectItem>
                  <SelectItem :value="120">2 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <!-- Slots -->
        <Card class="p-4">
          <Label class="mb-2 block">Horários disponíveis</Label>
          <div v-if="loadingSlots" class="py-6 text-center text-muted-foreground">
            <Loader2 class="h-5 w-5 mx-auto animate-spin" />
          </div>
          <div v-else-if="!selectedUser" class="py-6 text-center text-sm text-muted-foreground">
            Selecione o atendente.
          </div>
          <div v-else-if="!slots.length" class="py-6 text-center text-sm text-muted-foreground">
            Nenhum horário disponível neste dia.
          </div>
          <div v-else class="grid grid-cols-3 md:grid-cols-5 gap-2">
            <button
              v-for="s in slots"
              :key="s.start"
              type="button"
              class="rounded-md border px-3 py-2 text-sm font-medium transition"
              :class="selectedSlot?.start === s.start
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-accent/30'"
              @click="selectedSlot = s"
            >
              {{ s.start }}
            </button>
          </div>
        </Card>

        <!-- Dados do agendamento -->
        <Card v-if="selectedSlot" class="p-4 space-y-3">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <CalIcon class="h-4 w-4" />
            {{ fmtSelectedDate }} às {{ selectedSlot.start }}
            ({{ duration }} min)
          </div>

          <div class="space-y-1">
            <Label>Seu nome <span class="text-destructive">*</span></Label>
            <Input v-model="guest.name" />
          </div>
          <div class="space-y-1">
            <Label>E-mail <span class="text-destructive">*</span></Label>
            <Input v-model="guest.email" type="email" />
          </div>
          <div class="space-y-1">
            <Label>Telefone (opcional)</Label>
            <Input v-model="guest.phone" />
          </div>
          <div class="space-y-1">
            <Label>Observações (opcional)</Label>
            <textarea
              v-model="guest.notes"
              rows="3"
              class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <p
            v-if="errorMsg"
            class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {{ errorMsg }}
          </p>

          <Button class="w-full" :disabled="submitting" @click="onSubmit">
            <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
            Confirmar agendamento
          </Button>
        </Card>

        <p class="text-center text-xs text-muted-foreground">
          Powered by <strong>Zapifine</strong>
        </p>
      </div>
    </div>
  </div>
</template>
