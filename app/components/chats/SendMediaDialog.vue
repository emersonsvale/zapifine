<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Loader2, Upload, X, FileText } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: { url: string; caption?: string; filename?: string; mimetype?: string; mediaType?: string }]
}>()

const MAX_BYTES_BY_TYPE: Record<'image' | 'video' | 'audio' | 'document', number> = {
  image: 3 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  audio: 8 * 1024 * 1024,
  document: 10 * 1024 * 1024,
}

function detectMediaType(mime: string): 'image' | 'video' | 'audio' | 'document' {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'document'
}

function prettyMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)}MB`
}
const supabase = useSupabaseClient<Database>()
const authUser = useSupabaseUser()

const file = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const caption = ref('')
const uploading = ref(false)
const progress = ref(0)
const err = ref('')
const dragActive = ref(false)
const urlFallback = ref('')

const mediaType = computed<'image' | 'video' | 'audio' | 'document'>(() =>
  detectMediaType(file.value?.type ?? ''),
)

function resetState() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  file.value = null
  previewUrl.value = null
  caption.value = ''
  uploading.value = false
  progress.value = 0
  err.value = ''
  urlFallback.value = ''
}

watch(
  () => props.open,
  (o) => {
    if (o) resetState()
  },
)

function acceptFile(f: File | null) {
  if (!f) return
  err.value = ''
  const kind = detectMediaType(f.type ?? '')
  const limit = MAX_BYTES_BY_TYPE[kind]
  if (f.size > limit) {
    const labels: Record<typeof kind, string> = {
      image: 'imagem',
      video: 'vídeo',
      audio: 'áudio',
      document: 'documento',
    }
    err.value = `${labels[kind]} acima do limite de ${prettyMB(limit)}.`
    return
  }
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  file.value = f
  previewUrl.value = f.type.startsWith('image/') || f.type.startsWith('video/')
    ? URL.createObjectURL(f)
    : null
}

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  acceptFile(input.files?.[0] ?? null)
  input.value = ''
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragActive.value = false
  acceptFile(e.dataTransfer?.files?.[0] ?? null)
}

function onPaste(e: ClipboardEvent) {
  const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
    i.type.startsWith('image/') || i.type.startsWith('video/'),
  )
  if (item) {
    const f = item.getAsFile()
    if (f) acceptFile(f)
  }
}

function removeFile() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  file.value = null
  previewUrl.value = null
}

async function uploadAndSubmit() {
  err.value = ''

  let finalUrl = ''
  let filename: string | undefined
  let mimetype: string | undefined

  if (file.value) {
    const f = file.value
    const ext = (f.name.includes('.') ? f.name.split('.').pop() : '')?.toLowerCase() || ''
    const inferredMime = (() => {
      if (f.type && f.type !== 'text/plain' && f.type !== 'application/octet-stream') return f.type
      const map: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        heic: 'image/heic',
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        '3gp': 'video/3gpp',
        ogg: 'audio/ogg',
        mp3: 'audio/mpeg',
        m4a: 'audio/mp4',
        aac: 'audio/aac',
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        txt: 'text/plain',
      }
      return map[ext] || 'application/octet-stream'
    })()
    const companyFolder = (authUser.value?.user_metadata as { companie_id?: string })?.companie_id ?? 'shared'
    const path = `${companyFolder}/${crypto.randomUUID()}${ext ? '.' + ext : ''}`
    uploading.value = true
    progress.value = 10
    try {
      const { error: upErr } = await supabase.storage
        .from('chat-media')
        .upload(path, f, {
          cacheControl: '3600',
          upsert: false,
          contentType: inferredMime,
        })
      if (upErr) throw upErr
      progress.value = 80
      const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path)
      // CF Worker em api.zapifine.com bloqueia /storage/*. Evolution Go precisa baixar
      // a URL direto, então força o host do Supabase.
      finalUrl = urlData.publicUrl.replace(
        'https://api.zapifine.com/',
        'https://wpyxqtqlppsvuiwquigu.supabase.co/',
      )
      filename = f.name
      mimetype = inferredMime
      progress.value = 100
    } catch (e) {
      err.value = e instanceof Error ? e.message : 'Falha ao enviar arquivo.'
      uploading.value = false
      return
    }
    uploading.value = false
  } else if (urlFallback.value.trim()) {
    finalUrl = urlFallback.value.trim()
  } else {
    err.value = 'Selecione um arquivo ou cole uma URL.'
    return
  }

  try {
    await Promise.resolve(
      emit('submit', {
        url: finalUrl,
        caption: caption.value.trim() || undefined,
        filename,
        mimetype,
        mediaType: mediaType.value,
      }),
    )
    emit('update:open', false)
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Falha ao enviar.'
  }
}

function prettySize(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Enviar mídia</DialogTitle>
        <DialogDescription>
          Arraste um arquivo, cole (Ctrl+V) ou selecione. Limites: imagem 3MB, vídeo 16MB, áudio 8MB, documento 10MB.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-3" @paste="onPaste">
        <div
          v-if="!file"
          class="flex flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-6 transition-colors"
          :class="dragActive ? 'border-primary bg-muted/40' : 'border-muted-foreground/30'"
          @dragover.prevent="dragActive = true"
          @dragleave.prevent="dragActive = false"
          @drop="onDrop"
        >
          <Upload class="mb-2 h-8 w-8 text-muted-foreground" />
          <p class="mb-2 text-sm text-muted-foreground">
            Arraste aqui ou
          </p>
          <label class="cursor-pointer rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            Escolher arquivo
            <input
              type="file"
              class="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              @change="onFileInput"
            />
          </label>
        </div>

        <div
          v-else
          class="relative rounded-md border bg-muted/30 p-3"
        >
          <button
            type="button"
            class="absolute right-2 top-2 rounded-full bg-background p-1 shadow-sm hover:bg-accent"
            title="Remover"
            @click="removeFile"
          >
            <X class="h-4 w-4" />
          </button>
          <div class="flex items-start gap-3">
            <img
              v-if="previewUrl && mediaType === 'image'"
              :src="previewUrl"
              class="h-20 w-20 rounded object-cover"
            />
            <video
              v-else-if="previewUrl && mediaType === 'video'"
              :src="previewUrl"
              class="h-20 w-20 rounded bg-black object-cover"
              muted
            />
            <div
              v-else
              class="flex h-20 w-20 items-center justify-center rounded bg-muted"
            >
              <FileText class="h-8 w-8 text-muted-foreground" />
            </div>
            <div class="min-w-0 flex-1 text-xs">
              <p class="truncate font-medium">{{ file.name }}</p>
              <p class="text-muted-foreground">{{ prettySize(file.size) }}</p>
              <p class="text-muted-foreground">{{ mediaType }}</p>
            </div>
          </div>
        </div>

        <div v-if="uploading" class="space-y-1">
          <div class="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              class="h-full bg-emerald-500 transition-all"
              :style="{ width: `${progress}%` }"
            />
          </div>
          <p class="text-xs text-muted-foreground">Enviando arquivo... {{ progress }}%</p>
        </div>

        <div class="space-y-1.5">
          <Label>Legenda (opcional)</Label>
          <Input v-model="caption" placeholder="Texto abaixo da mídia" />
        </div>

        <details class="text-xs">
          <summary class="cursor-pointer text-muted-foreground hover:text-foreground">
            Ou usar URL pública
          </summary>
          <Input
            v-model="urlFallback"
            placeholder="https://..."
            class="mt-2"
          />
        </details>

        <p v-if="err" class="text-sm text-destructive">{{ err }}</p>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="uploading" @click="emit('update:open', false)">Cancelar</Button>
        <Button :disabled="uploading || (!file && !urlFallback.trim())" @click="uploadAndSubmit">
          <Loader2 v-if="uploading" class="h-4 w-4 animate-spin" />
          Enviar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
