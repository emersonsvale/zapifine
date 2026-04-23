<script setup lang="ts">
import { ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: { url: string; text?: string; title?: string; description?: string }]
}>()

const url = ref('')
const text = ref('')
const title = ref('')
const description = ref('')
const sending = ref(false)
const err = ref('')

watch(
  () => props.open,
  (o) => {
    if (o) {
      url.value = ''
      text.value = ''
      title.value = ''
      description.value = ''
      err.value = ''
      sending.value = false
    }
  },
)

async function onSubmit() {
  err.value = ''
  const u = url.value.trim()
  if (!u) {
    err.value = 'URL é obrigatória.'
    return
  }
  sending.value = true
  try {
    await Promise.resolve(
      emit('submit', {
        url: u,
        text: text.value.trim() || undefined,
        title: title.value.trim() || undefined,
        description: description.value.trim() || undefined,
      }),
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
        <DialogTitle>Enviar link</DialogTitle>
        <DialogDescription>
          Link com preview (opcional título e descrição).
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-3">
        <div class="space-y-1.5">
          <Label>URL</Label>
          <Input v-model="url" placeholder="https://..." />
        </div>

        <div class="space-y-1.5">
          <Label>Texto (opcional)</Label>
          <Input v-model="text" placeholder="Mensagem antes do link" />
        </div>

        <div class="space-y-1.5">
          <Label>Título (opcional)</Label>
          <Input v-model="title" />
        </div>

        <div class="space-y-1.5">
          <Label>Descrição (opcional)</Label>
          <Input v-model="description" />
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
