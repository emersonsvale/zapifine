<script setup lang="ts">
import { Loader2, Facebook, Instagram, ExternalLink } from 'lucide-vue-next'
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

async function submit() {
  if (!props.connection || !selectedPageId.value) return
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
      instagram_business_id: isInstagram.value ? page.instagram?.id ?? null : null,
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
              ? 'Faça login com Facebook e autorize o app.'
              : isInstagram
                ? 'Escolha a conta Instagram Business vinculada a uma Page.'
                : 'Escolha a Page Facebook que receberá mensagens.'
          }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <template v-if="!oauthCompleted">
          <Button class="w-full" @click="startOAuth">
            <Facebook class="h-4 w-4" />
            Continuar com Facebook
            <ExternalLink class="h-3.5 w-3.5 opacity-70" />
          </Button>
          <p class="text-xs text-muted-foreground">
            Você será redirecionado pro Facebook. Após autorizar, volta automaticamente.
          </p>
        </template>

        <template v-else>
          <div v-if="loading" class="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 class="h-5 w-5 animate-spin" />
          </div>

          <div v-else-if="eligible.length === 0" class="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
            <template v-if="isInstagram">
              Nenhuma conta Instagram Business vinculada às suas pages.
            </template>
            <template v-else>
              Nenhuma page Facebook encontrada.
            </template>
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
                <p v-if="isInstagram && p.instagram?.username" class="text-xs text-muted-foreground">
                  @{{ p.instagram.username }}
                </p>
                <p v-else-if="p.category" class="text-xs text-muted-foreground">{{ p.category }}</p>
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
          Cancelar
        </Button>
        <Button
          v-if="oauthCompleted"
          :disabled="loading || !selectedPageId"
          @click="submit"
        >
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
          Conectar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
