<script setup lang="ts">
import { ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: { contacts: Array<{ name: string; phone: string }> }]
}>()

const name = ref('')
const phone = ref('')
const sending = ref(false)
const err = ref('')

watch(
  () => props.open,
  (o) => {
    if (o) {
      name.value = ''
      phone.value = ''
      err.value = ''
      sending.value = false
    }
  },
)

async function onSubmit() {
  err.value = ''
  const n = name.value.trim()
  const p = phone.value.trim()
  if (!n || !p) {
    err.value = 'Nome e telefone obrigatórios.'
    return
  }
  sending.value = true
  try {
    await Promise.resolve(
      emit('submit', { contacts: [{ name: n, phone: p }] }),
    )
    emit('update:open', false)
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Falha ao enviar.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Enviar contato</DialogTitle>
        <DialogDescription>Compartilhar cartão de contato.</DialogDescription>
      </DialogHeader>

      <div class="space-y-3">
        <div class="space-y-1.5">
          <Label>Nome</Label>
          <Input v-model="name" placeholder="João Silva" />
        </div>

        <div class="space-y-1.5">
          <Label>Telefone</Label>
          <Input v-model="phone" placeholder="+5511999999999" />
        </div>

        <p v-if="err" class="text-sm text-destructive">{{ err }}</p>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">Cancelar</Button>
        <Button :disabled="sending" @click="onSubmit">
          <Loader2 v-if="sending" class="h-4 w-4 animate-spin" />
          Enviar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
