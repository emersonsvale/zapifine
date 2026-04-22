<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  Loader2,
  Info,
  LogOut,
  CheckCircle2,
  Eye,
  EyeOff,
  Copy,
  ChevronDown,
} from 'lucide-vue-next'

const {
  connection,
  isConnected,
  saveCloudApi,
  disconnectCloudApi,
} = useWhatsappConnection()

const runtime = useRuntimeConfig()
const metaAppId = runtime.public.metaAppId as string
const metaConfigId = runtime.public.metaConfigId as string
const metaConfigured = computed(() => !!metaAppId && !!metaConfigId)

const form = reactive({
  phoneNumberId: '',
  accessToken: '',
  wabaId: '',
  appId: '',
  coexistence: true,
})
const showToken = ref(false)
const showAdvanced = ref(false)

const panelActive = computed(() => connection.value?.provider === 'cloud_api')

watch(
  connection,
  (c) => {
    if (!c || c.provider !== 'cloud_api') return
    form.phoneNumberId = c.cloud_api_phone_number_id ?? ''
    form.accessToken = c.cloud_api_access_token ?? ''
    form.wabaId = c.cloud_api_waba_id ?? ''
    form.appId = c.cloud_api_app_id ?? ''
    form.coexistence = c.cloud_api_coexistence ?? true
  },
  { immediate: true },
)

const saving = ref(false)
const disconnecting = ref(false)
const message = ref<{ kind: 'ok' | 'err'; text: string } | null>(null)

// -------- Embedded Signup (Facebook Login for Business) --------

type SignupPayload = {
  phone_number_id?: string
  waba_id?: string
  business_id?: string
  event?: string
}

const signupPayload = ref<SignupPayload | null>(null)
let messageHandler: ((e: MessageEvent) => void) | null = null

function onMessage(e: MessageEvent) {
  if (
    e.origin !== 'https://www.facebook.com' &&
    e.origin !== 'https://web.facebook.com'
  )
    return
  try {
    const data =
      typeof e.data === 'string' ? JSON.parse(e.data) : (e.data as Record<string, unknown>)
    if (data?.type === 'WA_EMBEDDED_SIGNUP') {
      const payload = (data as { data?: SignupPayload }).data
      if (payload) signupPayload.value = payload
    }
  } catch {
    // ignore non-JSON postMessages
  }
}

onMounted(() => {
  if (typeof window === 'undefined') return
  messageHandler = onMessage
  window.addEventListener('message', messageHandler)
})
onBeforeUnmount(() => {
  if (messageHandler) window.removeEventListener('message', messageHandler)
})

async function openFacebookSignup() {
  if (!metaConfigured.value) {
    message.value = {
      kind: 'err',
      text: 'META_APP_ID / META_CONFIG_ID não configurados no .env.',
    }
    return
  }
  if (typeof window === 'undefined' || !window.FB) {
    message.value = {
      kind: 'err',
      text: 'Facebook SDK ainda carregando. Tente novamente em instantes.',
    }
    return
  }

  message.value = null
  signupPayload.value = null
  saving.value = true

  window.FB.login(
    async (response) => {
      const code = response?.authResponse?.code
      if (!code) {
        saving.value = false
        if (response?.status !== 'connected') {
          message.value = {
            kind: 'err',
            text: 'Autenticação cancelada.',
          }
        }
        return
      }

      try {
        const payload = signupPayload.value ?? {}
        const exchange = await $fetch<{
          ok: boolean
          accessToken: string
          phoneNumberId: string | null
          wabaId: string | null
          displayPhoneNumber: string | null
          verifiedName: string | null
        }>('/api/whatsapp/cloud/fb-exchange', {
          method: 'POST',
          body: {
            code,
            phoneNumberId: payload.phone_number_id ?? null,
            wabaId: payload.waba_id ?? null,
            coexistence: form.coexistence,
          },
        })

        if (!exchange.phoneNumberId) {
          message.value = {
            kind: 'err',
            text:
              'Token gerado mas phone_number_id não identificado. Preencha manualmente abaixo.',
          }
          form.accessToken = exchange.accessToken
          form.wabaId = exchange.wabaId ?? ''
          showAdvanced.value = true
          return
        }

        await saveCloudApi({
          accessToken: exchange.accessToken,
          phoneNumberId: exchange.phoneNumberId,
          wabaId: exchange.wabaId,
          appId: metaAppId,
          coexistence: form.coexistence,
        })
        message.value = {
          kind: 'ok',
          text: `Conectado como ${exchange.verifiedName ?? exchange.displayPhoneNumber ?? 'número verificado'}.`,
        }
      } catch (err) {
        const e = err as { data?: { message?: string }; statusMessage?: string; message?: string }
        message.value = {
          kind: 'err',
          text:
            e.data?.message ?? e.statusMessage ?? e.message ?? 'Falha na conexão.',
        }
      } finally {
        saving.value = false
      }
    },
    {
      config_id: metaConfigId,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        featureType: form.coexistence ? 'whatsapp_business_app_onboarding' : '',
        sessionInfoVersion: 3,
      },
    },
  )
}

// -------- Manual fallback (Advanced) --------

async function handleManualSave() {
  message.value = null
  if (!form.phoneNumberId.trim() || !form.accessToken.trim()) {
    message.value = {
      kind: 'err',
      text: 'Phone Number ID e Access Token são obrigatórios.',
    }
    return
  }
  saving.value = true
  try {
    const verified = await saveCloudApi({
      phoneNumberId: form.phoneNumberId.trim(),
      accessToken: form.accessToken.trim(),
      wabaId: form.wabaId.trim() || null,
      appId: form.appId.trim() || null,
      coexistence: form.coexistence,
    })
    message.value = {
      kind: 'ok',
      text: `Conectado como ${verified.verifiedName ?? verified.displayPhoneNumber ?? 'número verificado'}.`,
    }
  } catch (err) {
    const e = err as { data?: { message?: string }; message?: string; statusMessage?: string }
    message.value = {
      kind: 'err',
      text:
        e.data?.message ?? e.statusMessage ?? e.message ?? 'Falha na verificação.',
    }
  } finally {
    saving.value = false
  }
}

async function handleDisconnect() {
  message.value = null
  disconnecting.value = true
  try {
    await disconnectCloudApi()
    message.value = { kind: 'ok', text: 'Cloud API desconectada.' }
  } catch (err) {
    message.value = {
      kind: 'err',
      text: err instanceof Error ? err.message : 'Falha ao desconectar.',
    }
  } finally {
    disconnecting.value = false
  }
}

const webhookUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/api/whatsapp/cloud/webhook`
})
const webhookToken = computed(
  () => connection.value?.cloud_api_webhook_verify_token ?? '',
)

async function copy(text: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2 text-xl">
        <span
          class="h-2.5 w-2.5 rounded-full"
          :class="isConnected && panelActive ? 'bg-emerald-500' : 'bg-red-500'"
        />
        WhatsApp Cloud API (Oficial)
      </CardTitle>
      <CardDescription>
        Integração oficial do Meta com suporte a
        <strong>Coexistence</strong> — usar em paralelo com o app WhatsApp Business.
      </CardDescription>
    </CardHeader>

    <CardContent>
      <!-- Connected state -->
      <div
        v-if="isConnected && panelActive"
        class="mb-6 flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm"
      >
        <CheckCircle2 class="h-5 w-5 text-emerald-500" />
        <div class="flex-1">
          <p class="font-medium text-emerald-300">
            Conectado como
            <span class="font-semibold">
              {{
                connection?.cloud_api_verified_name ??
                connection?.cloud_api_display_name ??
                '—'
              }}
            </span>
          </p>
          <p class="text-xs text-muted-foreground">
            Phone ID: {{ connection?.cloud_api_phone_number_id }}
            <span v-if="connection?.cloud_api_waba_id">
              · WABA: {{ connection.cloud_api_waba_id }}
            </span>
            <span v-if="connection?.cloud_api_coexistence"> · Coexistence ativo</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          :disabled="disconnecting"
          @click="handleDisconnect"
        >
          <Loader2 v-if="disconnecting" class="h-3.5 w-3.5 animate-spin" />
          <LogOut v-else class="h-3.5 w-3.5" />
          Desconectar
        </Button>
      </div>

      <!-- Embedded Signup CTA -->
      <div
        class="flex flex-col items-center justify-center gap-4 rounded-md border border-dashed bg-muted/30 p-8 text-center"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-full bg-[#1877F2]/15">
          <svg
            viewBox="0 0 24 24"
            class="h-7 w-7 fill-[#1877F2]"
            aria-hidden="true"
          >
            <path
              d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
            />
          </svg>
        </div>
        <div class="space-y-1">
          <p class="text-base font-semibold">
            Conectar com Facebook (Embedded Signup)
          </p>
          <p class="text-sm text-muted-foreground">
            O Meta abre um fluxo oficial. Você seleciona a conta
            WhatsApp Business, o número e nós recebemos o token.
          </p>
        </div>

        <label
          class="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs"
        >
          <input
            v-model="form.coexistence"
            type="checkbox"
            class="h-3.5 w-3.5 rounded accent-primary"
          />
          Habilitar Coexistence (usar em paralelo com app WhatsApp Business)
        </label>

        <Button
          type="button"
          class="bg-[#1877F2] text-white hover:bg-[#1877F2]/90"
          :disabled="saving || !metaConfigured"
          @click="openFacebookSignup"
        >
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          Conectar com Facebook
        </Button>

        <p v-if="!metaConfigured" class="text-xs text-destructive">
          Configure <code>META_APP_ID</code> e <code>META_CONFIG_ID</code>
          no <code>.env</code> para habilitar o botão.
        </p>
      </div>

      <p
        v-if="message"
        class="mt-4 rounded-md border px-3 py-2 text-sm"
        :class="
          message.kind === 'ok'
            ? 'border-primary/30 bg-primary/10 text-primary'
            : 'border-destructive/30 bg-destructive/10 text-destructive'
        "
      >
        {{ message.text }}
      </p>

      <!-- Advanced: manual -->
      <button
        type="button"
        class="mt-6 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        @click="showAdvanced = !showAdvanced"
      >
        <ChevronDown
          class="h-3.5 w-3.5 transition-transform"
          :class="{ '-rotate-180': showAdvanced }"
        />
        Configurar manualmente (avançado)
      </button>

      <form
        v-if="showAdvanced"
        class="mt-4 space-y-4"
        @submit.prevent="handleManualSave"
      >
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="cloud-phone-id">Phone Number ID</Label>
            <Input
              id="cloud-phone-id"
              v-model="form.phoneNumberId"
              placeholder="Ex: 123456789012345"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="cloud-waba-id">WABA ID</Label>
            <Input
              id="cloud-waba-id"
              v-model="form.wabaId"
              placeholder="Detectado automaticamente"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <Label for="cloud-token">Access Token (permanente)</Label>
          <div class="relative">
            <Input
              id="cloud-token"
              v-model="form.accessToken"
              :type="showToken ? 'text' : 'password'"
              placeholder="EAAG..."
              class="pr-10 font-mono"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              @click="showToken = !showToken"
            >
              <EyeOff v-if="showToken" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="space-y-1.5">
          <Label for="cloud-app-id">App ID (opcional)</Label>
          <Input id="cloud-app-id" v-model="form.appId" />
        </div>

        <Button type="submit" variant="outline" :disabled="saving">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          Salvar credenciais manuais
        </Button>
      </form>

      <!-- Webhook section -->
      <div
        v-if="isConnected && panelActive"
        class="mt-8 space-y-3 rounded-md border border-border bg-muted/20 p-4"
      >
        <div class="flex items-start gap-2">
          <Info class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div class="text-sm">
            <p class="font-medium">Webhook do Meta</p>
            <p class="mt-1 text-muted-foreground">
              Configure em Meta → WABA → Webhooks. Inscreva-se em
              <code class="rounded bg-muted px-1">messages</code> e
              <code class="rounded bg-muted px-1">message_status</code>.
            </p>
          </div>
        </div>
        <div class="space-y-1.5">
          <Label>Callback URL</Label>
          <div class="flex gap-2">
            <Input :model-value="webhookUrl" readonly class="font-mono text-xs" />
            <Button type="button" size="icon" variant="outline" @click="copy(webhookUrl)">
              <Copy class="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div class="space-y-1.5">
          <Label>Verify Token</Label>
          <div class="flex gap-2">
            <Input
              :model-value="webhookToken"
              readonly
              class="font-mono text-xs"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              @click="copy(webhookToken)"
            >
              <Copy class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
