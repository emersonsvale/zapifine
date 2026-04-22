<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Loader2,
  QrCode,
  RefreshCw,
  LogOut,
  CheckCircle2,
} from 'lucide-vue-next'

const { connection, isConnected, statusLabel, generateQr, disconnect } =
  useWhatsappConnection()

const generating = ref(false)
const disconnecting = ref(false)
const errorMsg = ref('')

const qrImageSrc = computed(() => {
  const raw = connection.value?.qr_code_url
  if (!raw) return null
  return raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`
})

const qrExpired = computed(() => {
  const c = connection.value
  if (!c || isConnected.value) return false
  if (c.provider !== 'evolution') return false
  if (!c.qr_code_url) return true
  if (!c.updated_at) return false
  const ageMs = Date.now() - new Date(c.updated_at).getTime()
  return ageMs > 60_000
})

async function handleGenerate() {
  errorMsg.value = ''
  generating.value = true
  try {
    await generateQr()
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Falha ao gerar QR.'
  } finally {
    generating.value = false
  }
}

async function handleDisconnect() {
  errorMsg.value = ''
  disconnecting.value = true
  try {
    await disconnect()
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : 'Falha ao desconectar.'
  } finally {
    disconnecting.value = false
  }
}

const panelActive = computed(() => connection.value?.provider === 'evolution')
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2 text-xl">
        <span
          class="h-2.5 w-2.5 rounded-full"
          :class="isConnected && panelActive ? 'bg-emerald-500' : 'bg-red-500'"
        />
        {{ panelActive ? statusLabel : 'Evolution API (Baileys)' }}
      </CardTitle>
      <CardDescription>
        Conexão via QR Code. Não-oficial, feature-rich para automação.
      </CardDescription>
    </CardHeader>

    <CardContent>
      <div
        class="flex flex-col items-center justify-center gap-4 rounded-md border border-dashed bg-muted/30 py-10"
      >
        <template v-if="isConnected && panelActive">
          <div
            class="flex h-40 w-40 items-center justify-center rounded-full bg-emerald-500/10"
          >
            <CheckCircle2 class="h-20 w-20 text-emerald-500" />
          </div>
          <p class="text-sm text-muted-foreground">
            Seu WhatsApp está conectado via Evolution.
          </p>
          <Button
            variant="outline"
            :disabled="disconnecting"
            @click="handleDisconnect"
          >
            <Loader2 v-if="disconnecting" class="h-4 w-4 animate-spin" />
            <LogOut v-else class="h-4 w-4" />
            Desconectar
          </Button>
        </template>

        <template v-else-if="qrImageSrc && !qrExpired">
          <img
            :src="qrImageSrc"
            alt="QR Code WhatsApp"
            class="h-56 w-56 rounded-md bg-white p-3"
          />
          <p class="text-sm text-muted-foreground">
            Escaneie o QR Code com seu WhatsApp para conectar.
          </p>
          <Button
            variant="outline"
            :disabled="generating"
            @click="handleGenerate"
          >
            <RefreshCw
              class="h-4 w-4"
              :class="{ 'animate-spin': generating }"
            />
            Gerar novo QR Code
          </Button>
        </template>

        <template v-else>
          <div
            class="flex h-40 w-40 items-center justify-center rounded-md border border-destructive/40 bg-destructive/5"
          >
            <QrCode class="h-20 w-20 text-destructive/60" />
          </div>
          <div class="text-center">
            <p class="text-sm font-medium text-destructive">
              {{ connection?.provider === 'evolution' && connection?.qr_code_url ? 'QR Code expirado' : 'Sem QR Code ativo' }}
            </p>
            <p class="mt-0.5 text-xs text-muted-foreground">
              Clique em "Gerar novo QR Code" para continuar.
            </p>
          </div>
          <Button :disabled="generating" @click="handleGenerate">
            <Loader2 v-if="generating" class="h-4 w-4 animate-spin" />
            <QrCode v-else class="h-4 w-4" />
            Gerar novo QR Code
          </Button>
        </template>
      </div>

      <p
        v-if="errorMsg"
        class="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        role="alert"
      >
        {{ errorMsg }}
      </p>

      <div class="mt-6">
        <h4 class="text-sm font-semibold">Instruções</h4>
        <ol class="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>1. Abra o WhatsApp no seu celular</li>
          <li>2. Acesse Configurações &gt; Aparelhos Conectados</li>
          <li>3. Toque em "Conectar um aparelho" e escaneie o QR</li>
          <li>4. Aguarde até que a conexão seja estabelecida</li>
        </ol>
      </div>
    </CardContent>
  </Card>
</template>
