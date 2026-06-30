<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import {
  providerLabel,
  type ChannelConnection,
} from '~/composables/useChannelConnections'

const props = defineProps<{
  open: boolean
  connection: ChannelConnection | null
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'saved'): void
}>()

const { patch } = useChannelConnections()

const displayName = ref('')
const isPrincipal = ref(false)
const submitting = ref(false)
const errorMsg = ref('')

watch(
  () => props.open,
  (v) => {
    if (v && props.connection) {
      displayName.value = props.connection.display_name ?? ''
      isPrincipal.value = props.connection.is_principal
      errorMsg.value = ''
    }
  },
)

async function submit() {
  if (!props.connection) return
  submitting.value = true
  errorMsg.value = ''
  try {
    await patch(props.connection.id, {
      display_name: displayName.value.trim() || undefined,
      is_principal: isPrincipal.value,
    })
    emit('saved')
    emit('update:open', false)
  } catch (err) {
    const e = err as { data?: { statusMessage?: string }; message?: string }
    errorMsg.value = e.data?.statusMessage ?? e.message ?? 'Falha ao salvar.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Editar conexão</DialogTitle>
        <DialogDescription v-if="connection">
          {{ providerLabel(connection.provider) }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div class="space-y-1.5">
          <Label for="edit_display_name">Nome</Label>
          <Input id="edit_display_name" v-model="displayName" maxlength="80" />
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="isPrincipal" type="checkbox" class="h-4 w-4" />
          Conexão principal de atendimento
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
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
