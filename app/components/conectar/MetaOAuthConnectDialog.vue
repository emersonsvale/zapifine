<script setup lang="ts">
import { Loader2, Facebook, Instagram, ExternalLink, CheckCircle2 } from 'lucide-vue-next'
import type { ChannelConnection } from '~/composables/useChannelConnections'

type MetaPage = {
  id: string
  name: string
  access_token: string
  category: string | null
  instagram: { id: string; username: string | null } | null
}

const props = defineProps<{
  open: boolean
  connection: ChannelConnection | null
  oauthCompleted: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'configured'): void
}>()

const { listMetaPages, configureMetaPage } = useChannelConnections()

const loading = ref(false)
const errorMsg = ref('')
const pages = ref<MetaPage[]>([])
const selectedPageId = ref<string | null>(null)

const isInstagram = computed(() => props.connection?.provider === 'instagram')

const eligible = computed(() => {
  if (isInstagram.value) return pages.value.filter((p) => p.instagram)
  return pages.value
})

watch(
  () => [props.open, props.oauthCompleted, props.connection?.id],
  async () => {
    if (!props.open || !props.connection || !props.oauthCompleted) {
      pages.value = []
      selectedPageId.value = null
      errorMsg.value = ''
      return
    }
    // Instagram Login: o backend já conectou a conta e assinou o webhook no exchange.
    // Não há Página pra escolher — nada a carregar aqui.
    if (isInstagram.value) return

    // Facebook Messenger: carrega as Páginas pra o usuário escolher.
    loading.value = true
    errorMsg.value = ''
    try {
      pages.value = await listMetaPages(props.connection.id)
    } catch (err) {
      const e = err as { data?: { statusMessage?: string }; message?: string }
      errorMsg.value = e.data?.statusMessage ?? e.message ?? 'Falha ao listar pages.'
    } finally {
      loading.value = false
    }
  },
)

function startOAuth() {
  if (!props.connection) return
  window.location.href = `/api/connections/${props.connection.id}/meta-oauth/start`
}

// Instagram: só confirmar (já está conectado). Facebook: configurar a Página escolhida.
async function submit() {
  if (!props.connection) return
  if (isInstagram.value) {
    emit('configured')
    emit('update:open', false)
    return
  }
  if (!selectedPageId.value) return
  const page = pages.value.find((p) => p.id === selectedPageId.value)
  if (!page) return
  loading.value = true
  errorMsg.value = ''
  try {
    await configureMetaPage(props.connection.id, {
      user_access_token: 'stored',
      page_id: page.id,
      page_access_token: page.access_token,
      page_name: page.name,
      instagram_business_id: null,
    })
    emit('configured')
    emit('update:open', false)
  } catch (err) {
    const e = err as { data?: { statusMessage?: string }; message?: string }
    errorMsg.value = e.data?.statusMessage ?? e.message ?? 'Falha ao configurar.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <component :is="isInstagram ? Instagram : Facebook" class="h-5 w-5" />
          Conectar {{ isInstagram ? 'Instagram Direct' : 'Facebook Messenger' }}
        </DialogTitle>
        <DialogDescription>
          {{
            !oauthCompleted
              ? isInstagram
                ? 'Faça login com sua conta Instagram profissional e autorize o app.'
                : 'Faça login com Facebook e autorize o app.'
              : isInstagram
                ? 'Conta conectada com sucesso.'
                : 'Escolha a Page Facebook que receberá mensagens.'
          }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <template v-if="!oauthCompleted">
          <Button class="w-full" @click="startOAuth">
            <component :is="isInstagram ? Instagram : Facebook" class="h-4 w-4" />
            Continuar com {{ isInstagram ? 'Instagram' : 'Facebook' }}
            <ExternalLink class="h-3.5 w-3.5 opacity-70" />
          </Button>
          <p class="text-xs text-muted-foreground">
            Você será redirecionado pro {{ isInstagram ? 'Instagram' : 'Facebook' }}. Após autorizar, volta automaticamente.
          </p>
        </template>

        <template v-else-if="isInstagram">
          <div class="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 class="h-8 w-8 text-primary" />
            <p class="text-sm font-medium">Instagram conectado!</p>
            <p class="text-xs text-muted-foreground">
              Já estamos recebendo mensagens do Direct e comentários desta conta.
            </p>
          </div>
        </template>

        <template v-else>
          <div v-if="loading" class="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 class="h-5 w-5 animate-spin" />
          </div>

          <div v-else-if="eligible.length === 0" class="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
            Nenhuma page Facebook encontrada.
          </div>

          <div v-else class="space-y-2 max-h-72 overflow-y-auto pr-1">
            <label
              v-for="p in eligible"
              :key="p.id"
              class="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/30"
              :class="selectedPageId === p.id ? 'border-primary bg-primary/5' : ''"
            >
              <input
                v-model="selectedPageId"
                type="radio"
                :value="p.id"
                class="h-4 w-4"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ p.name }}</p>
                <p v-if="p.category" class="text-xs text-muted-foreground">{{ p.category }}</p>
              </div>
            </label>
          </div>
        </template>

        <p
          v-if="errorMsg"
          class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {{ errorMsg }}
        </p>
      </div>

      <DialogFooter>
        <Button variant="ghost" :disabled="loading" @click="emit('update:open', false)">
          {{ oauthCompleted && isInstagram ? 'Fechar' : 'Cancelar' }}
        </Button>
        <Button
          v-if="oauthCompleted"
          :disabled="loading || (!isInstagram && !selectedPageId)"
          @click="submit"
        >
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
          {{ isInstagram ? 'Concluir' : 'Conectar' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
