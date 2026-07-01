<script setup lang="ts">
import {
  Smartphone,
  WifiOff,
  QrCode,
  LogOut,
  Trash2,
  Star,
  StarOff,
  Loader2,
  MoreVertical,
  RefreshCw,
  History,
} from 'lucide-vue-next'
import {
  providerLabel,
  type ChannelConnection,
} from '~/composables/useChannelConnections'

const props = defineProps<{ conn: ChannelConnection }>()
const emit = defineEmits<{
  (e: 'connect', id: string): void
  (e: 'logout', id: string): void
  (e: 'remove', id: string): void
  (e: 'set-principal', id: string, val: boolean): void
  (e: 'edit', id: string): void
}>()

const busy = ref<'connect' | 'logout' | 'remove' | 'principal' | 'sync' | null>(null)
const syncMsg = ref<string | null>(null)
const { syncHistory } = useChannelConnections()

const canSync = computed(
  () => props.conn.is_connected && props.conn.provider === 'whatsapp_uazapi',
)

async function handleSync() {
  if (!canSync.value) return
  busy.value = 'sync'
  syncMsg.value = null
  try {
    const r = await syncHistory(props.conn.id)
    syncMsg.value = `${r.imported} novas · ${r.skipped} já existiam · ${r.chats} chats`
  } catch (err) {
    syncMsg.value = err instanceof Error ? err.message : 'Falha no sync'
  } finally {
    busy.value = null
    setTimeout(() => (syncMsg.value = null), 6000)
  }
}

const statusLabel = computed(() => {
  const c = props.conn
  if (c.is_connected || c.connection_status === 'open') return 'Conectado'
  switch (c.connection_status) {
    case 'connecting':
    case 'pairing':
      return 'Conectando…'
    case 'qr':
      return 'Aguardando QR'
    case 'pending':
      return 'Pendente'
    case 'close':
      return 'Desconectado'
    default:
      return c.connection_status ?? 'Desconhecido'
  }
})

const statusTone = computed(() => {
  const c = props.conn
  if (c.is_connected) return 'bg-emerald-500'
  if (c.connection_status === 'qr' || c.connection_status === 'connecting') return 'bg-amber-500'
  return 'bg-zinc-500'
})

const labelText = computed(() => props.conn.display_name || providerLabel(props.conn.provider))

async function handle(action: 'connect' | 'logout' | 'remove' | 'principal') {
  busy.value = action
  try {
    if (action === 'connect') emit('connect', props.conn.id)
    if (action === 'logout') emit('logout', props.conn.id)
    if (action === 'remove') emit('remove', props.conn.id)
    if (action === 'principal') emit('set-principal', props.conn.id, !props.conn.is_principal)
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row items-start justify-between space-y-0 gap-2">
      <div class="flex items-start gap-3 min-w-0">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-full border bg-muted/40"
        >
          <Smartphone v-if="conn.is_connected" class="h-5 w-5 text-emerald-400" />
          <WifiOff v-else class="h-5 w-5 text-muted-foreground" />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="truncate font-semibold">{{ labelText }}</span>
            <Badge v-if="conn.is_principal" variant="default" class="gap-1">
              <Star class="h-3 w-3" />
              Principal
            </Badge>
          </div>
          <p class="text-xs text-muted-foreground">
            {{ providerLabel(conn.provider) }}
          </p>
          <p v-if="conn.phone_number" class="text-xs text-muted-foreground">
            {{ conn.phone_number }}
          </p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon" class="h-8 w-8 shrink-0">
            <MoreVertical class="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem @select="emit('edit', conn.id)">
            <RefreshCw class="h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem @select="handle('principal')">
            <component :is="conn.is_principal ? StarOff : Star" class="h-4 w-4" />
            {{ conn.is_principal ? 'Remover principal' : 'Marcar principal' }}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            v-if="conn.is_connected"
            class="text-amber-500 focus:text-amber-500"
            @select="handle('logout')"
          >
            <LogOut class="h-4 w-4" />
            Desconectar
          </DropdownMenuItem>
          <DropdownMenuItem
            class="text-destructive focus:text-destructive"
            @select="handle('remove')"
          >
            <Trash2 class="h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </CardHeader>

    <CardContent class="space-y-3">
      <div class="flex items-center gap-2 text-sm">
        <span class="h-2 w-2 rounded-full" :class="statusTone" />
        <span>{{ statusLabel }}</span>
      </div>

      <div v-if="!conn.is_connected" class="flex gap-2">
        <Button size="sm" :disabled="busy === 'connect'" @click="handle('connect')">
          <Loader2 v-if="busy === 'connect'" class="h-4 w-4 animate-spin" />
          <QrCode v-else class="h-4 w-4" />
          {{ conn.qr_code_url ? 'Reabrir QR' : 'Conectar' }}
        </Button>
      </div>

      <div v-if="canSync" class="flex flex-col gap-1">
        <Button
          size="sm"
          variant="outline"
          :disabled="busy === 'sync'"
          @click="handleSync"
        >
          <Loader2 v-if="busy === 'sync'" class="h-4 w-4 animate-spin" />
          <History v-else class="h-4 w-4" />
          Sincronizar conversas
        </Button>
        <p v-if="syncMsg" class="text-xs text-muted-foreground">{{ syncMsg }}</p>
      </div>

      <AgentBindingSelect v-if="conn.is_connected" :connection-id="conn.id" />
    </CardContent>
  </Card>
</template>
