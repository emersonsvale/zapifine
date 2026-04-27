<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Loader2,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-vue-next'

definePageMeta({ layout: false, auth: false })

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ''))

useHead({
  title: 'Agendar horário',
  htmlAttrs: { class: '' },
})

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

const step = ref<'pick' | 'form'>('pick')

const tz = computed(
  () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
)

function pad(n: number) { return String(n).padStart(2, '0') }
function isoOf(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function todayIso() { return isoOf(new Date()) }

const viewMonth = ref<Date>(new Date())

onMounted(async () => {
  const t = new Date()
  viewMonth.value = new Date(t.getFullYear(), t.getMonth(), 1)
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
    // Auto-seleciona se só houver 1 atendente; mais de 1 = "Qualquer" (null) por padrão
    if (res.members.length === 1) selectedUser.value = res.members[0]!.id
  } catch (err) {
    errorMsg.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
      ?? 'Agenda não encontrada.'
  } finally {
    loadingMeta.value = false
  }
}

async function loadSlots() {
  if (!selectedDate.value) {
    slots.value = []
    return
  }
  loadingSlots.value = true
  selectedSlot.value = null
  try {
    const q: Record<string, string | number> = {
      date: selectedDate.value,
      duration: duration.value,
    }
    if (selectedUser.value) q.user_id = selectedUser.value
    const res = await $fetch<{ slots: Array<{ start: string; end: string }> }>(
      `/api/public/agendas/${encodeURIComponent(slug.value)}/slots`,
      { query: q },
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

function shiftMonth(delta: number) {
  const d = new Date(viewMonth.value)
  d.setMonth(d.getMonth() + delta)
  viewMonth.value = d
}

const monthLabel = computed(() => {
  const d = viewMonth.value
  const m = d.toLocaleDateString('pt-BR', { month: 'long' })
  return `${m.charAt(0).toUpperCase() + m.slice(1)} ${d.getFullYear()}`
})

type Cell = { date: Date; iso: string; inMonth: boolean; isPast: boolean; isToday: boolean }

const monthCells = computed<Cell[]>(() => {
  const first = new Date(viewMonth.value.getFullYear(), viewMonth.value.getMonth(), 1)
  const startWeekday = first.getDay() // 0 = dom
  const daysInMonth = new Date(
    viewMonth.value.getFullYear(),
    viewMonth.value.getMonth() + 1,
    0,
  ).getDate()

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const cells: Cell[] = []

  // leading blanks (days from prev month for grid alignment)
  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(first); d.setDate(first.getDate() - (startWeekday - i))
    cells.push({
      date: d, iso: isoOf(d), inMonth: false,
      isPast: d < today, isToday: false,
    })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(viewMonth.value.getFullYear(), viewMonth.value.getMonth(), day)
    cells.push({
      date: d, iso: isoOf(d), inMonth: true,
      isPast: d < today,
      isToday: d.getTime() === today.getTime(),
    })
  }
  // trailing blanks p/ completar grid (até múltiplo de 7)
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]!.date
    const d = new Date(last); d.setDate(d.getDate() + 1)
    cells.push({
      date: d, iso: isoOf(d), inMonth: false,
      isPast: d < today, isToday: false,
    })
  }
  return cells
})

const weekdayLabels = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

function pickDate(cell: Cell) {
  if (cell.isPast) return
  selectedDate.value = cell.iso
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function onSubmit() {
  if (!selectedSlot.value) {
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
          ...(selectedUser.value ? { user_id: selectedUser.value } : {}),
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
    await loadSlots()
  } finally {
    submitting.value = false
  }
}

const fmtSelectedDate = computed(() => {
  if (!selectedDate.value) return ''
  const d = new Date(`${selectedDate.value}T12:00:00`)
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
})

const selectedHost = computed(() => members.value.find(m => m.id === selectedUser.value))

const durationOptions = [
  { v: 15, label: '15m' },
  { v: 30, label: '30m' },
  { v: 45, label: '45m' },
  { v: 60, label: '1h' },
]

function goToForm(s: { start: string; end: string }) {
  selectedSlot.value = s
  step.value = 'form'
}
function backToPick() {
  step.value = 'pick'
  selectedSlot.value = null
}
</script>

<template>
  <div class="min-h-screen bg-[#F5F1E8] text-zinc-900">
    <div class="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <!-- Loading meta -->
      <div v-if="loadingMeta" class="text-center py-20 text-zinc-500">
        <Loader2 class="h-8 w-8 mx-auto animate-spin" />
        <p class="mt-3">Carregando...</p>
      </div>

      <!-- Erro fatal -->
      <div v-else-if="!company" class="text-center py-20">
        <p class="text-lg font-semibold">Agenda não encontrada</p>
        <p class="text-sm text-zinc-500 mt-2">{{ errorMsg }}</p>
      </div>

      <!-- Sucesso -->
      <div
        v-else-if="success"
        class="mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm space-y-4"
      >
        <CheckCircle2 class="h-16 w-16 mx-auto text-emerald-500" />
        <h1 class="text-2xl font-bold">Agendamento confirmado!</h1>
        <p class="text-zinc-600">
          {{ new Date(success.when).toLocaleString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
          }) }}
        </p>
        <p class="text-sm text-zinc-500">
          Você receberá um e-mail com os detalhes.
        </p>
        <a
          v-if="success.link"
          :href="success.link"
          target="_blank"
          rel="noopener"
          class="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium hover:bg-zinc-50"
        >
          Ver no Google Calendar
        </a>
      </div>

      <!-- Card principal -->
      <div
        v-else
        class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
      >
        <div class="grid md:grid-cols-[300px_1fr]">
          <!-- ============== SIDEBAR ============== -->
          <aside class="border-b border-zinc-200 p-6 md:border-b-0 md:border-r">
            <button
              v-if="step === 'form'"
              type="button"
              class="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
              @click="backToPick"
            >
              <ArrowLeft class="h-4 w-4" /> Voltar
            </button>

            <!-- Avatar + nome host -->
            <div class="mb-4 flex items-center gap-3">
              <div class="h-10 w-10 overflow-hidden rounded-full bg-zinc-200">
                <img
                  v-if="selectedHost?.foto_perfil"
                  :src="selectedHost.foto_perfil"
                  :alt="selectedHost.nome ?? ''"
                  class="h-full w-full object-cover"
                  referrerpolicy="no-referrer"
                  loading="lazy"
                >
                <img
                  v-else-if="company.logo_url"
                  :src="company.logo_url"
                  :alt="company.name"
                  class="h-full w-full object-cover"
                  referrerpolicy="no-referrer"
                  loading="lazy"
                >
              </div>
              <span class="text-sm font-medium text-zinc-700">
                {{ selectedHost?.nome ?? company.name }}
              </span>
            </div>

            <h1 class="text-2xl font-bold leading-tight">
              {{ company.titulo ?? `Agendar com ${company.name}` }}
            </h1>

            <p
              v-if="company.descricao"
              class="mt-3 text-sm leading-relaxed text-zinc-500"
            >
              {{ company.descricao }}
            </p>

            <!-- Seletor de host (só se >1) -->
            <div v-if="members.length > 1" class="mt-5">
              <label class="mb-1.5 block text-xs font-medium text-zinc-600">
                Atendente
              </label>
              <select
                v-model="selectedUser"
                class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              >
                <option :value="null">Qualquer atendente</option>
                <option v-for="m in members" :key="m.id" :value="m.id">
                  {{ m.nome ?? 'Atendente' }}
                </option>
              </select>
            </div>

            <!-- Duração (chips) -->
            <div class="mt-5">
              <div class="flex items-center gap-2 text-zinc-500">
                <Clock class="h-4 w-4" />
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="opt in durationOptions"
                    :key="opt.v"
                    type="button"
                    class="rounded-md px-2.5 py-1 text-xs font-medium transition"
                    :class="duration === opt.v
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:bg-zinc-100'"
                    @click="duration = opt.v"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Timezone -->
            <div class="mt-3 flex items-center gap-2 text-sm text-zinc-500">
              <Globe class="h-4 w-4" />
              <span>{{ tz }}</span>
            </div>
          </aside>

          <!-- ============== MAIN ============== -->
          <section class="p-6">
            <!-- ETAPA: pick (calendário + slots) -->
            <div v-if="step === 'pick'" class="grid gap-6 md:grid-cols-[1fr_220px]">
              <!-- Calendário -->
              <div>
                <div class="mb-4 flex items-center justify-between">
                  <h2 class="text-base font-semibold">{{ monthLabel }}</h2>
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      class="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                      @click="shiftMonth(-1)"
                    >
                      <ChevronLeft class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                      @click="shiftMonth(1)"
                    >
                      <ChevronRight class="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-zinc-400">
                  <div v-for="w in weekdayLabels" :key="w">{{ w }}</div>
                </div>

                <div class="mt-2 grid grid-cols-7 gap-1">
                  <button
                    v-for="(c, i) in monthCells"
                    :key="i"
                    type="button"
                    :disabled="!c.inMonth || c.isPast"
                    class="relative aspect-square rounded-md text-sm font-medium transition"
                    :class="[
                      !c.inMonth ? 'text-zinc-300' : '',
                      c.isPast && c.inMonth ? 'cursor-not-allowed text-zinc-300' : '',
                      c.inMonth && !c.isPast && selectedDate !== c.iso
                        ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                        : '',
                      selectedDate === c.iso
                        ? 'bg-zinc-900 text-white hover:bg-zinc-900'
                        : '',
                    ]"
                    @click="pickDate(c)"
                  >
                    {{ c.date.getDate() }}
                    <span
                      v-if="c.isToday && selectedDate !== c.iso"
                      class="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-zinc-900"
                    />
                  </button>
                </div>
              </div>

              <!-- Slots -->
              <div v-if="selectedDate">
                <p class="mb-3 text-sm font-semibold capitalize">
                  {{ fmtSelectedDate }}
                </p>
                <div v-if="loadingSlots" class="py-6 text-center text-zinc-400">
                  <Loader2 class="h-5 w-5 mx-auto animate-spin" />
                </div>
                <div
                  v-else-if="!slots.length"
                  class="py-6 text-center text-sm text-zinc-500"
                >
                  Nenhum horário disponível.
                </div>
                <div v-else class="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
                  <button
                    v-for="s in slots"
                    :key="s.start"
                    type="button"
                    class="rounded-md border border-zinc-300 bg-white px-3 py-3 text-sm font-semibold text-zinc-900 transition hover:border-zinc-900 hover:bg-zinc-900 hover:text-white"
                    @click="goToForm(s)"
                  >
                    {{ s.start }}
                  </button>
                </div>
              </div>
            </div>

            <!-- ETAPA: form -->
            <div v-else class="max-w-md">
              <p class="mb-4 text-sm text-zinc-500">
                <span class="font-semibold capitalize text-zinc-900">{{ fmtSelectedDate }}</span>
                · {{ selectedSlot?.start }} ({{ duration }} min)
              </p>

              <div class="space-y-4">
                <div>
                  <label class="mb-1 block text-sm font-medium">
                    Seu nome <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="guest.name"
                    type="text"
                    class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium">
                    E-mail <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="guest.email"
                    type="email"
                    class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium">Telefone (opcional)</label>
                  <input
                    v-model="guest.phone"
                    type="text"
                    class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium">Observações (opcional)</label>
                  <textarea
                    v-model="guest.notes"
                    rows="3"
                    class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <p
                  v-if="errorMsg"
                  class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {{ errorMsg }}
                </p>

                <button
                  type="button"
                  class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-zinc-900 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                  :disabled="submitting"
                  @click="onSubmit"
                >
                  <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
                  Confirmar agendamento
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <p class="mt-6 text-center text-xs text-zinc-400">
        Powered by <strong class="text-zinc-600">Zapifine</strong>
      </p>
    </div>
  </div>
</template>
