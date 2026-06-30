<script setup lang="ts">
import { Loader2, RefreshCw, QrCode, CheckCircle2, Clock } from 'lucide-vue-next'
import {
  providerLabel,
  type ChannelConnection,
} from '~/composables/useChannelConnections'

const QR_LIFETIME_MS = 45_000

const props = defineProps<{
  open: boolean
  connection: ChannelConnection | null
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'connected'): void
}>()

const { connect, checkState } = useChannelConnections()

const generating = ref(false)
const errorMsg = ref('')
const qrShownAt = ref<number | null>(null)
const now = ref(Date.now())
const state = ref<string | null>(null)
const connected = ref(false)

let tickTimer: ReturnType<typeof setInterval> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

function startTimers(id: string) {
  stopTimers()
  tickTimer = setInterval(() => (now.value = Date.now()), 1000)
  pollTimer = setInterval(async () => {
    try {
      const r = await checkState(id)
      state.value = r.state
      connected.value = r.connected
      if (r.connected) {
        emit('connected')
        emit('update:open', false)
      }
    } catch {
      // swallow
    }
  }, 4000)
}

function stopTimers() {
  if (tickTimer) clearInterval(tickTimer)
  if (pollTimer) clearInterval(pollTimer)
  tickTimer = null
  pollTimer = null
}

onBeforeUnmount(stopTimers)

const qrImage = computed(() => {
  const qr = props.connection?.qr_code_url
  if (!qr) return null
  return qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`
})

const qrAgeMs = computed(() => (qrShownAt.value ? Math.max(0, now.value - qrShownAt.value) : 0))
const qrRemainingSec = computed(() =>
  Math.max(0, Math.ceil((QR_LIFETIME_MS - qrAgeMs.value) / 1000)),
)
const qrExpired = computed(() => qrShownAt.value !== null && qrAgeMs.value > QR_LIFETIME_MS)

async function regenerate() {
  if (!props.connection) return
  errorMsg.value = ''
  generating.value = true
  try {
    await connect(props.connection.id)
    qrShownAt.value = Date.now()
    startTimers(props.connection.id)
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Falha ao gerar QR.'
  } finally {
    generating.value = false
  }
}

watch(
  () => props.open,
  async (v) => {
    if (v && props.connection) {
      if (!props.connection.qr_code_url) {
        await regenerate()
      } else {
        qrShownAt.value = Date.now()
        startTimers(props.connection.id)
      }
    } else {
      stopTimers()
      qrShownAt.value = null
      errorMsg.value = ''
    }
  },
)
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>
          Conectar · {{ connection ? providerLabel(connection.provider) : '' }}
        </DialogTitle>
        <DialogDescription>
          Escaneie o QR Code com seu WhatsApp.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col items-center gap-4 py-2">
        <template v-if="connected">
          <div class="flex h-32 w-32 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 class="h-16 w-16 text-emerald-500" />
          </div>
          <p class="text-sm text-muted-foreground">Conectado com sucesso.</p>
        </template>

        <template v-else-if="qrImage && !qrExpired">
          <img :src="qrImage" alt="QR Code" class="h-56 w-56 rounded-md bg-white p-3" />
          <div class="flex items-center gap-1.5 text-sm font-medium" :class="qrRemainingSec <= 10 ? 'text-destructive' : qrRemainingSec <= 20 ? 'text-amber-500' : 'text-emerald-500'">
            <Clock class="h-4 w-4" />
            <span>Expira em {{ qrRemainingSec }}s</span>
          </div>
        </template>

        <template v-else>
          <div class="flex h-32 w-32 items-center justify-center rounded-md border border-dashed">
            <QrCode class="h-16 w-16 text-muted-foreground/50" />
          </div>
          <p class="text-sm text-muted-foreground">
            {{ qrExpired ? 'QR expirado. Gere um novo.' : 'Sem QR ativo.' }}
          </p>
        </template>

        <Button v-if="!connected" :disabled="generating" variant="outline" @click="regenerate">
          <Loader2 v-if="generating" class="h-4 w-4 animate-spin" />
          <RefreshCw v-else class="h-4 w-4" />
          {{ qrImage && !qrExpired ? 'Gerar novo QR' : 'Gerar QR' }}
        </Button>

        <p
          v-if="errorMsg"
          class="w-full rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {{ errorMsg }}
        </p>
      </div>

      <DialogFooter>
        <Button variant="ghost" @click="emit('update:open', false)">Fechar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
