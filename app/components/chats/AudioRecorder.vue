<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Mic, Square, Trash2, Send, Loader2 } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

const emit = defineEmits<{
  sent: []
}>()

const supabase = useSupabaseClient<Database>()
const authUser = useSupabaseUser()
const { sendRich } = useChats()
const { toast } = useAlerts()

const MAX_AUDIO_BYTES = 8 * 1024 * 1024
const MAX_DURATION_MS = 5 * 60 * 1000

type State = 'idle' | 'recording' | 'review' | 'sending'
const state = ref<State>('idle')

const recorder = ref<MediaRecorder | null>(null)
const chunks = ref<Blob[]>([])
const blob = ref<Blob | null>(null)
const previewUrl = ref<string | null>(null)
const startedAt = ref<number>(0)
const elapsedMs = ref<number>(0)
let tickTimer: ReturnType<typeof setInterval> | null = null
let stream: MediaStream | null = null

const elapsedLabel = computed(() => {
  const ms = elapsedMs.value
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

function pickMime(): string {
  const candidates = [
    'audio/ogg;codecs=opus',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ]
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c
  }
  return ''
}

function clearTimers() {
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}

function stopStream() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop())
    stream = null
  }
}

function resetAll() {
  clearTimers()
  stopStream()
  recorder.value = null
  chunks.value = []
  blob.value = null
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
  state.value = 'idle'
  elapsedMs.value = 0
}

async function startRecording() {
  if (state.value !== 'idle') return
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Permita acesso ao microfone.')
    return
  }
  const mime = pickMime()
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  recorder.value = rec
  chunks.value = []
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.value.push(e.data)
  }
  rec.onstop = () => {
    const finalMime = rec.mimeType || 'audio/webm'
    const b = new Blob(chunks.value, { type: finalMime })
    blob.value = b
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = URL.createObjectURL(b)
    stopStream()
    clearTimers()
    state.value = 'review'
  }
  rec.start()
  startedAt.value = Date.now()
  elapsedMs.value = 0
  state.value = 'recording'
  tickTimer = setInterval(() => {
    elapsedMs.value = Date.now() - startedAt.value
    if (elapsedMs.value >= MAX_DURATION_MS) stopRecording()
  }, 250)
}

function stopRecording() {
  const rec = recorder.value
  if (!rec) return
  if (rec.state !== 'inactive') rec.stop()
}

function discard() {
  resetAll()
}

async function send() {
  const b = blob.value
  if (!b) return
  if (b.size > MAX_AUDIO_BYTES) {
    toast.error(`Áudio acima de ${(MAX_AUDIO_BYTES / 1024 / 1024).toFixed(0)}MB.`)
    return
  }
  state.value = 'sending'
  try {
    const mime = b.type || 'audio/webm'
    const ext = mime.includes('ogg')
      ? 'ogg'
      : mime.includes('mp4')
        ? 'm4a'
        : 'webm'
    const companyFolder = (authUser.value?.user_metadata as { companie_id?: string })?.companie_id ?? 'shared'
    const path = `${companyFolder}/audio-${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('chat-media')
      .upload(path, b, {
        cacheControl: '3600',
        upsert: false,
        contentType: mime,
      })
    if (upErr) throw upErr
    const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path)
    const url = urlData.publicUrl.replace(
      'https://api.zapifine.com/',
      'https://wpyxqtqlppsvuiwquigu.supabase.co/',
    )
    await sendRich({
      type: 'media',
      url,
      mediaType: 'audio',
      mimetype: mime,
      filename: `audio.${ext}`,
    } as never)
    emit('sent')
    resetAll()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao enviar áudio.')
    state.value = 'review'
  }
}

onBeforeUnmount(() => {
  resetAll()
})
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- IDLE: botão Mic -->
    <Button
      v-if="state === 'idle'"
      variant="ghost"
      size="icon"
      title="Gravar áudio"
      @click="startRecording"
    >
      <Mic class="h-4 w-4" />
    </Button>

    <!-- RECORDING: contador + parar -->
    <template v-else-if="state === 'recording'">
      <div class="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 dark:border-red-800 dark:bg-red-950/40">
        <span class="relative flex h-2 w-2">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span class="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
        </span>
        <span class="text-xs font-medium tabular-nums text-red-700 dark:text-red-300">
          {{ elapsedLabel }}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        title="Parar gravação"
        @click="stopRecording"
      >
        <Square class="h-4 w-4 text-red-600" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Cancelar"
        @click="discard"
      >
        <Trash2 class="h-4 w-4 text-muted-foreground" />
      </Button>
    </template>

    <!-- REVIEW: preview + send/discard -->
    <template v-else-if="state === 'review' || state === 'sending'">
      <audio v-if="previewUrl" :src="previewUrl" controls class="h-9 max-w-[200px]" />
      <Button
        variant="ghost"
        size="icon"
        title="Descartar"
        :disabled="state === 'sending'"
        @click="discard"
      >
        <Trash2 class="h-4 w-4 text-muted-foreground" />
      </Button>
      <Button
        size="icon"
        title="Enviar áudio"
        :disabled="state === 'sending'"
        @click="send"
      >
        <Loader2 v-if="state === 'sending'" class="h-4 w-4 animate-spin" />
        <Send v-else class="h-4 w-4" />
      </Button>
    </template>
  </div>
</template>
