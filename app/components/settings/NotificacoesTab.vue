<script setup lang="ts">
import { computed } from 'vue'
import { Bell, BellOff, Loader2 } from 'lucide-vue-next'

const { supported, permission, subscribed, busy, enable, disable } =
  usePushNotifications()
const { toast } = useAlerts()

const blocked = computed(() => permission.value === 'denied')
const statusLabel = computed(() => {
  if (!supported.value) return 'Navegador sem suporte a notificações push.'
  if (blocked.value) {
    return 'Permissão bloqueada. Libere no cadeado/ícone da barra do navegador.'
  }
  if (subscribed.value) {
    return 'Push ativo. Você recebe avisos mesmo com o app fechado.'
  }
  return 'Ative para receber avisos de novas mensagens com o app fechado.'
})

async function onEnable() {
  const res = await enable()
  if (res.ok) {
    toast.success('Notificações push ativadas neste dispositivo.')
  } else if (res.reason === 'permission-denied') {
    toast.error('Permissão negada pelo navegador.')
  } else if (res.reason === 'unsupported') {
    toast.error('Navegador não suporta push.')
  } else if (res.reason === 'no-vapid-key') {
    toast.error('VAPID_PUBLIC_KEY não configurada no servidor.')
  } else {
    toast.error('Falha ao ativar push.')
  }
}

async function onDisable() {
  const ok = await disable()
  if (ok) toast.success('Notificações push desativadas neste dispositivo.')
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <Bell class="h-5 w-5" />
        Notificações push
      </CardTitle>
      <CardDescription>
        Receba avisos de novas mensagens mesmo com o navegador fechado ou em
        outra aba. Cada dispositivo precisa ativar separado.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <p class="text-sm text-muted-foreground">{{ statusLabel }}</p>

      <div class="flex gap-2">
        <Button
          v-if="!subscribed"
          :disabled="!supported || blocked || busy"
          @click="onEnable"
        >
          <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
          <Bell v-else class="h-4 w-4" />
          Ativar push neste dispositivo
        </Button>
        <Button
          v-else
          variant="outline"
          :disabled="busy"
          @click="onDisable"
        >
          <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
          <BellOff v-else class="h-4 w-4" />
          Desativar push neste dispositivo
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
