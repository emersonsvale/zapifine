<script setup lang="ts">
import { ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: { url: string; caption?: string; filename?: string; mediaType?: string }]
}>()

const url = ref('')
const caption = ref('')
const filename = ref('')
const mediaType = ref<'image' | 'video' | 'audio' | 'document'>('image')
const sending = ref(false)
const err = ref('')

watch(
  () => props.open,
  (o) => {
    if (o) {
      url.value = ''
      caption.value = ''
      filename.value = ''
      mediaType.value = 'image'
      err.value = ''
      sending.value = false
    }
  },
)

async function onSubmit() {
  err.value = ''
  const u = url.value.trim()
  if (!u) {
    err.value = 'URL da mídia é obrigatória.'
    return
  }
  sending.value = true
  try {
    await Promise.resolve(
      emit('submit', {
        url: u,
        caption: caption.value.trim() || undefined,
        filename: filename.value.trim() || undefined,
        mediaType: mediaType.value,
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
        <DialogTitle>Enviar mídia</DialogTitle>
        <DialogDescription>
          Cole a URL pública da imagem, vídeo, áudio ou documento.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-3">
        <div class="space-y-1.5">
          <Label>Tipo</Label>
          <Select v-model="mediaType">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Imagem</SelectItem>
              <SelectItem value="video">Vídeo</SelectItem>
              <SelectItem value="audio">Áudio</SelectItem>
              <SelectItem value="document">Documento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-1.5">
          <Label>URL</Label>
          <Input v-model="url" placeholder="https://..." />
        </div>

        <div class="space-y-1.5">
          <Label>Legenda (opcional)</Label>
          <Input v-model="caption" placeholder="Texto abaixo da mídia" />
        </div>

        <div class="space-y-1.5">
          <Label>Nome do arquivo (opcional)</Label>
          <Input v-model="filename" placeholder="documento.pdf" />
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
