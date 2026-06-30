<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import {
  providerLabel,
  type ChannelType,
} from '~/composables/useChannelConnections'

const props = defineProps<{
  open: boolean
  provider: ChannelType | null
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'created', id: string): void
}>()

const { createConnection } = useChannelConnections()

const displayName = ref('')
const isPrincipal = ref(false)
const submitting = ref(false)
const errorMsg = ref('')

watch(
  () => props.open,
  (v) => {
    if (v) {
      displayName.value = ''
      isPrincipal.value = false
      errorMsg.value = ''
    }
  },
)

async function submit() {
  if (!props.provider) return
  submitting.value = true
  errorMsg.value = ''
  try {
    const conn = await createConnection({
      provider: props.provider,
      display_name: displayName.value.trim() || undefined,
      is_principal: isPrincipal.value,
    })
    emit('created', conn.id)
    emit('update:open', false)
  } catch (err) {
    const e = err as { data?: { statusMessage?: string }; message?: string }
    errorMsg.value = e.data?.statusMessage ?? e.message ?? 'Falha ao criar conexão.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>
          Nova conexão · {{ provider ? providerLabel(provider) : '' }}
        </DialogTitle>
        <DialogDescription>
          Crie a conexão. O próximo passo varia por provedor (QR, token, OAuth).
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div class="space-y-1.5">
          <Label for="display_name">Nome (opcional)</Label>
          <Input
            id="display_name"
            v-model="displayName"
            placeholder="Ex: Atendimento Vendas"
            maxlength="80"
          />
          <p class="text-xs text-muted-foreground">
            Apelido pra identificar essa conexão internamente.
          </p>
        </div>

        <label class="flex items-center gap-2 text-sm">
          <input v-model="isPrincipal" type="checkbox" class="h-4 w-4" />
          Marcar como conexão principal de atendimento
        </label>

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
        <Button :disabled="submitting" @click="submit">
          <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
          Criar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
