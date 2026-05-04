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
const AUDIO_MIME = 'audio/ogg'

type State = 'idle' | 'recording' | 'review' | 'sending'
const state = ref<State>('idle')

type OpusRec = {
  start: () => Promise<void>
  stop: () => Promise<void> | void
  close: () => void
  ondataavailable: ((buf: Uint8Array | ArrayBuffer) => void) | null
  onstop: (() => void) | null
}

const recorder = ref<OpusRec | null>(null)
const blob = ref<Blob | null>(null)
const previewUrl = ref<string | null>(null)
const startedAt = ref<number>(0)
const elapsedMs = ref<number>(0)
let tickTimer: ReturnType<typeof setInterval> | null = null

const elapsedLabel = computed(() => {
  const ms = elapsedMs.value
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

function clearTimers() {
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}

function resetAll() {
  clearTimers()
  if (recorder.value) {
    try { recorder.value.close() } catch { /* noop */ }
    recorder.value = null
  }
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
    // @ts-expect-error opus-recorder ships no types
    const mod = await import('opus-recorder')
    const Recorder = (mod as {
      default: (new (cfg: Record<string, unknown>) => OpusRec) & {
        isRecordingSupported: () => boolean
      }
    }).default
    if (!Recorder.isRecordingSupported()) {
      toast.error('Navegador não suporta gravação Opus.')
      return
    }
    const rec = new Recorder({
      encoderPath: '/encoderWorker.min.js',
      encoderApplication: 2048,
      encoderFrameSize: 20,
      encoderSampleRate: 48000,
      numberOfChannels: 1,
      streamPages: false,
    })
    rec.ondataavailable = (buf) => {
      const u8 = buf instanceof Uint8Array ? new Uint8Array(buf) : new Uint8Array(buf as ArrayBuffer)
      const b = new Blob([u8], { type: AUDIO_MIME })
      blob.value = b
      if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = URL.createObjectURL(b)
    }
    rec.onstop = () => {
      clearTimers()
      state.value = 'review'
    }
    await rec.start()
    recorder.value = rec
    startedAt.value = Date.now()
    elapsedMs.value = 0
    state.value = 'recording'
    tickTimer = setInterval(() => {
      elapsedMs.value = Date.now() - startedAt.value
      if (elapsedMs.value >= MAX_DURATION_MS) stopRecording()
    }, 250)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao iniciar gravação.')
    resetAll()
  }
}

function stopRecording() {
  const rec = recorder.value
  if (!rec) return
  try {
    void rec.stop()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao parar gravação.')
  }
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
    const companyFolder = (authUser.value?.user_metadata as { companie_id?: string })?.companie_id ?? 'shared'
    const path = `${companyFolder}/audio-${crypto.randomUUID()}.ogg`
    const { error: upErr } = await supabase.storage
      .from('chat-media')
      .upload(path, b, {
        cacheControl: '3600',
        upsert: false,
        contentType: AUDIO_MIME,
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
      mimetype: AUDIO_MIME,
      filename: 'audio.ogg',
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
