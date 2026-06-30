<script setup lang="ts">
import { Loader2, ShieldCheck } from 'lucide-vue-next'
import type { ChannelConnection } from '~/composables/useChannelConnections'

const props = defineProps<{
  open: boolean
  connection: ChannelConnection | null
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'configured'): void
}>()

const { configureCloud } = useChannelConnections()

const accessToken = ref('')
const phoneNumberId = ref('')
const wabaId = ref('')
const appId = ref('')
const submitting = ref(false)
const errorMsg = ref('')

watch(
  () => props.open,
  (v) => {
    if (v && props.connection) {
      accessToken.value = ''
      phoneNumberId.value = props.connection.cloud_api_phone_number_id ?? ''
      wabaId.value = ''
      appId.value = ''
      errorMsg.value = ''
    }
  },
)

async function submit() {
  if (!props.connection) return
  errorMsg.value = ''
  submitting.value = true
  try {
    await configureCloud(props.connection.id, {
      accessToken: accessToken.value.trim(),
      phoneNumberId: phoneNumberId.value.trim(),
      wabaId: wabaId.value.trim() || null,
      appId: appId.value.trim() || null,
    })
    emit('configured')
    emit('update:open', false)
  } catch (err) {
    const e = err as { data?: { statusMessage?: string }; message?: string }
    errorMsg.value = e.data?.statusMessage ?? e.message ?? 'Falha ao configurar.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <ShieldCheck class="h-5 w-5 text-emerald-500" />
          Configurar Cloud API (Meta)
        </DialogTitle>
        <DialogDescription>
          Informe access token + phone_number_id obtidos no Meta Business.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div class="space-y-1.5">
          <Label for="cloud_access_token">Access Token *</Label>
          <Input
            id="cloud_access_token"
            v-model="accessToken"
            type="password"
            placeholder="EAAxxxx..."
            autocomplete="off"
          />
        </div>
        <div class="space-y-1.5">
          <Label for="cloud_phone_id">Phone Number ID *</Label>
          <Input
            id="cloud_phone_id"
            v-model="phoneNumberId"
            placeholder="1234567890"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label for="cloud_waba">WABA ID</Label>
            <Input id="cloud_waba" v-model="wabaId" placeholder="opcional" />
          </div>
          <div class="space-y-1.5">
            <Label for="cloud_app">App ID</Label>
            <Input id="cloud_app" v-model="appId" placeholder="opcional" />
          </div>
        </div>

        <p
          v-if="errorMsg"
          class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {{ errorMsg }}
        </p>
      </div>

      <DialogFooter>
        <Button variant="ghost" :disabled="submitting" @click="emit('update:open', false)">
          Cancelar
        </Button>
        <Button
          :disabled="submitting || !accessToken || !phoneNumberId"
          @click="submit"
        >
          <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
          Validar e salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
