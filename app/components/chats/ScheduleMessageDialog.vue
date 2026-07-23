<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Loader2,
  Upload,
  X,
  FileText,
  Type as TypeIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  CalendarClock,
} from 'lucide-vue-next'
import type { Database } from '~~/types/database'
import type {
  ScheduledMessage,
  ScheduledMessageDraft,
  ScheduledMessageTipo,
  ScheduledMediaTipo,
} from '~/composables/useScheduledMessages'

const props = defineProps<{
  open: boolean
  /** Quando presente, o dialog abre em modo edição. */
  editing?: ScheduledMessage | null
  /** Nome do contato — usado no texto de exemplo. */
  contactName?: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: ScheduledMessageDraft]
}>()

const MAX_BYTES_BY_TYPE: Record<ScheduledMediaTipo, number> = {
  image: 3 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  audio: 8 * 1024 * 1024,
  document: 10 * 1024 * 1024,
}

function detectMediaType(mime: string): ScheduledMediaTipo {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'document'
}

function prettyMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)}MB`
}

function prettySize(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

const supabase = useSupabaseClient<Database>()
const authUser = useSupabaseUser()

const tipo = ref<ScheduledMessageTipo>('text')
const texto = ref('')
const dataStr = ref('')
const horaStr = ref('')
const err = ref('')
const saving = ref(false)

// mídia
const file = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const uploading = ref(false)
const progress = ref(0)
const midiaUrlAtual = ref<string | null>(null)
const midiaNomeAtual = ref<string | null>(null)
const midiaMimeAtual = ref<string | null>(null)
const midiaTipoAtual = ref<ScheduledMediaTipo | null>(null)
const urlFallback = ref('')

// link
const linkUrl = ref('')
const linkTitulo = ref('')
const linkDescricao = ref('')

const isEditing = computed(() => !!props.editing)

const exampleText = computed(() => {
  const nome = props.contactName?.trim().split(' ')[0]
  return nome
    ? `Ex.: Oi ${nome}, tudo bem? Passando pra lembrar da nossa conversa 🙂`
    : 'Ex.: Oi, tudo bem? Passando pra lembrar da nossa conversa 🙂'
})

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toLocalFields(d: Date) {
  return {
    data: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

function defaultWhen(): Date {
  // Padrão: daqui 1h, arredondado pros 5min seguintes.
  const d = new Date(Date.now() + 60 * 60 * 1000)
  d.setSeconds(0, 0)
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5)
  return d
}

function setWhen(d: Date) {
  const f = toLocalFields(d)
  dataStr.value = f.data
  horaStr.value = f.hora
}

function quickIn(minutes: number) {
  const d = new Date(Date.now() + minutes * 60 * 1000)
  d.setSeconds(0, 0)
  setWhen(d)
}

function quickTomorrowMorning() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  setWhen(d)
}

function clearMedia() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
  file.value = null
  midiaUrlAtual.value = null
  midiaNomeAtual.value = null
  midiaMimeAtual.value = null
  midiaTipoAtual.value = null
  urlFallback.value = ''
}

function resetState() {
  err.value = ''
  saving.value = false
  uploading.value = false
  progress.value = 0
  clearMedia()
  linkUrl.value = ''
  linkTitulo.value = ''
  linkDescricao.value = ''

  const e = props.editing
  if (e) {
    tipo.value = e.tipo
    texto.value = e.mensagem ?? ''
    midiaUrlAtual.value = e.midia_url
    midiaNomeAtual.value = e.midia_nome
    midiaMimeAtual.value = e.midia_mime
    midiaTipoAtual.value = e.midia_tipo
    linkUrl.value = e.link_url ?? ''
    linkTitulo.value = e.link_titulo ?? ''
    linkDescricao.value = e.link_descricao ?? ''
    setWhen(new Date(e.scheduled_at))
    return
  }

  tipo.value = 'text'
  texto.value = ''
  setWhen(defaultWhen())
}

watch(
  () => props.open,
  (o) => {
    if (o) resetState()
  },
)

const mediaType = computed<ScheduledMediaTipo>(() =>
  file.value ? detectMediaType(file.value.type ?? '') : midiaTipoAtual.value ?? 'document',
)

function acceptFile(f: File | null) {
  if (!f) return
  err.value = ''
  const kind = detectMediaType(f.type ?? '')
  const limit = MAX_BYTES_BY_TYPE[kind]
  if (f.size > limit) {
    const labels: Record<ScheduledMediaTipo, string> = {
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
  midiaUrlAtual.value = null
  previewUrl.value =
    f.type.startsWith('image/') || f.type.startsWith('video/')
      ? URL.createObjectURL(f)
      : null
}

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  acceptFile(input.files?.[0] ?? null)
  input.value = ''
}

const dragActive = ref(false)
function onDrop(e: DragEvent) {
  e.preventDefault()
  dragActive.value = false
  acceptFile(e.dataTransfer?.files?.[0] ?? null)
}

function inferMime(f: File, ext: string): string {
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
}

/** Sobe o arquivo agora (na criação) — na hora do envio o worker só usa a URL. */
async function uploadFileIfNeeded(): Promise<{
  url: string
  nome: string | null
  mime: string | null
  tipo: ScheduledMediaTipo
} | null> {
  if (file.value) {
    const f = file.value
    const ext = (f.name.includes('.') ? f.name.split('.').pop() : '')?.toLowerCase() || ''
    const mime = inferMime(f, ext)
    const companyFolder =
      (authUser.value?.user_metadata as { companie_id?: string })?.companie_id ?? 'shared'
    const path = `${companyFolder}/${crypto.randomUUID()}${ext ? '.' + ext : ''}`
    uploading.value = true
    progress.value = 10
    try {
      const { error: upErr } = await supabase.storage
        .from('chat-media')
        .upload(path, f, { cacheControl: '3600', upsert: false, contentType: mime })
      if (upErr) throw upErr
      progress.value = 80
      const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path)
      // CF Worker em api.zapifine.com bloqueia /storage/*; força o host do Supabase.
      const finalUrl = urlData.publicUrl.replace(
        'https://api.zapifine.com/',
        'https://wpyxqtqlppsvuiwquigu.supabase.co/',
      )
      progress.value = 100
      return { url: finalUrl, nome: f.name, mime, tipo: detectMediaType(mime) }
    } finally {
      uploading.value = false
    }
  }
  if (urlFallback.value.trim()) {
    return {
      url: urlFallback.value.trim(),
      nome: null,
      mime: null,
      tipo: midiaTipoAtual.value ?? 'document',
    }
  }
  if (midiaUrlAtual.value) {
    return {
      url: midiaUrlAtual.value,
      nome: midiaNomeAtual.value,
      mime: midiaMimeAtual.value,
      tipo: midiaTipoAtual.value ?? 'document',
    }
  }
  return null
}

const scheduledDate = computed<Date | null>(() => {
  if (!dataStr.value || !horaStr.value) return null
  const [y, m, d] = dataStr.value.split('-').map(Number)
  const [hh, mm] = horaStr.value.split(':').map(Number)
  if (!y || !m || !d || hh == null || mm == null) return null
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0)
  return Number.isNaN(dt.getTime()) ? null : dt
})

const whenLabel = computed(() => {
  const dt = scheduledDate.value
  if (!dt) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(dt)
})

async function submit() {
  err.value = ''
  const dt = scheduledDate.value
  if (!dt) {
    err.value = 'Escolha data e hora.'
    return
  }
  if (dt.getTime() <= Date.now()) {
    err.value = 'A data/hora precisa ser no futuro.'
    return
  }

  const draft: ScheduledMessageDraft = {
    tipo: tipo.value,
    mensagem: texto.value.trim() || null,
    scheduled_at: dt.toISOString(),
  }

  if (tipo.value === 'text') {
    if (!draft.mensagem) {
      err.value = 'Escreva a mensagem.'
      return
    }
  } else if (tipo.value === 'link') {
    const url = linkUrl.value.trim()
    if (!url) {
      err.value = 'Informe a URL do link.'
      return
    }
    draft.link_url = url
    draft.link_titulo = linkTitulo.value.trim() || null
    draft.link_descricao = linkDescricao.value.trim() || null
  }

  saving.value = true
  try {
    if (tipo.value === 'media') {
      const media = await uploadFileIfNeeded()
      if (!media) {
        err.value = 'Selecione um arquivo ou cole uma URL.'
        return
      }
      draft.midia_url = media.url
      draft.midia_nome = media.nome
      draft.midia_mime = media.mime
      draft.midia_tipo = media.tipo
    }
    await Promise.resolve(emit('submit', draft))
    emit('update:open', false)
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Falha ao agendar.'
  } finally {
    saving.value = false
  }
}

const busy = computed(() => saving.value || uploading.value)
</script>

<template>
  <Dialog :open="props.open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <CalendarClock class="h-5 w-5 text-primary" />
          {{ isEditing ? 'Editar mensagem agendada' : 'Agendar mensagem' }}
        </DialogTitle>
        <DialogDescription>
          A mensagem fica na fila e é enviada automaticamente na data e hora escolhidas.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <!-- Tipo -->
        <div class="grid grid-cols-3 gap-1 rounded-md bg-muted/50 p-1">
          <button
            type="button"
            class="flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition-colors"
            :class="tipo === 'text' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="tipo = 'text'"
          >
            <TypeIcon class="h-3.5 w-3.5" />
            Texto
          </button>
          <button
            type="button"
            class="flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition-colors"
            :class="tipo === 'media' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="tipo = 'media'"
          >
            <ImageIcon class="h-3.5 w-3.5" />
            Mídia/Arquivo
          </button>
          <button
            type="button"
            class="flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition-colors"
            :class="tipo === 'link' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="tipo = 'link'"
          >
            <LinkIcon class="h-3.5 w-3.5" />
            Link
          </button>
        </div>

        <!-- Texto / legenda -->
        <div class="space-y-1.5">
          <Label for="sched-text">
            {{ tipo === 'text' ? 'Mensagem' : 'Texto (opcional)' }}
          </Label>
          <textarea
            id="sched-text"
            v-model="texto"
            rows="4"
            :placeholder="exampleText"
            class="w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <p class="text-[11px] text-muted-foreground">
            Formatação do WhatsApp funciona: *negrito*, _itálico_, ~riscado~.
          </p>
        </div>

        <!-- Mídia -->
        <template v-if="tipo === 'media'">
          <div
            v-if="!file && !midiaUrlAtual"
            class="flex flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-6 transition-colors"
            :class="dragActive ? 'border-primary bg-muted/40' : 'border-muted-foreground/30'"
            @dragover.prevent="dragActive = true"
            @dragleave.prevent="dragActive = false"
            @drop="onDrop"
          >
            <Upload class="mb-2 h-8 w-8 text-muted-foreground" />
            <p class="mb-2 text-center text-xs text-muted-foreground">
              Arraste aqui ou escolha um arquivo<br />
              (imagem 3MB, vídeo 16MB, áudio 8MB, documento 10MB)
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

          <div v-else class="relative rounded-md border bg-muted/30 p-3">
            <button
              type="button"
              class="absolute right-2 top-2 rounded-full bg-background p-1 shadow-sm hover:bg-accent"
              title="Remover"
              @click="clearMedia"
            >
              <X class="h-4 w-4" />
            </button>
            <div class="flex items-start gap-3">
              <img
                v-if="previewUrl && mediaType === 'image'"
                :src="previewUrl"
                class="h-20 w-20 rounded object-cover"
              />
              <img
                v-else-if="!file && midiaUrlAtual && midiaTipoAtual === 'image'"
                :src="midiaUrlAtual"
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
                <p class="truncate font-medium">
                  {{ file?.name ?? midiaNomeAtual ?? 'Arquivo anexado' }}
                </p>
                <p v-if="file" class="text-muted-foreground">{{ prettySize(file.size) }}</p>
                <p class="text-muted-foreground">{{ mediaType }}</p>
              </div>
            </div>
          </div>

          <div v-if="uploading" class="space-y-1">
            <div class="h-1.5 overflow-hidden rounded-full bg-muted">
              <div class="h-full bg-emerald-500 transition-all" :style="{ width: `${progress}%` }" />
            </div>
            <p class="text-xs text-muted-foreground">Enviando arquivo... {{ progress }}%</p>
          </div>

          <details v-if="!file && !midiaUrlAtual" class="text-xs">
            <summary class="cursor-pointer text-muted-foreground hover:text-foreground">
              Ou usar URL pública
            </summary>
            <Input v-model="urlFallback" placeholder="https://..." class="mt-2" />
          </details>
        </template>

        <!-- Link -->
        <template v-else-if="tipo === 'link'">
          <div class="space-y-1.5">
            <Label for="sched-link">URL</Label>
            <Input id="sched-link" v-model="linkUrl" placeholder="https://..." />
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-1.5">
              <Label for="sched-link-title">Título (opcional)</Label>
              <Input id="sched-link-title" v-model="linkTitulo" placeholder="Título da prévia" />
            </div>
            <div class="space-y-1.5">
              <Label for="sched-link-desc">Descrição (opcional)</Label>
              <Input id="sched-link-desc" v-model="linkDescricao" placeholder="Descrição da prévia" />
            </div>
          </div>
        </template>

        <!-- Quando -->
        <div class="space-y-2 rounded-md border p-3">
          <Label class="flex items-center gap-1.5">
            <CalendarClock class="h-4 w-4" />
            Enviar em
          </Label>
          <div class="flex gap-2">
            <Input v-model="dataStr" type="date" class="flex-1" />
            <Input v-model="horaStr" type="time" class="w-32" />
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              type="button"
              class="rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              @click="quickIn(30)"
            >
              +30 min
            </button>
            <button
              type="button"
              class="rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              @click="quickIn(60)"
            >
              +1 hora
            </button>
            <button
              type="button"
              class="rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              @click="quickIn(60 * 24)"
            >
              +24 horas
            </button>
            <button
              type="button"
              class="rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              @click="quickTomorrowMorning"
            >
              Amanhã 9h
            </button>
          </div>
          <p v-if="whenLabel" class="text-[11px] text-muted-foreground">
            Será enviada {{ whenLabel }}.
          </p>
        </div>

        <p v-if="err" class="text-sm text-destructive">{{ err }}</p>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="busy" @click="emit('update:open', false)">
          Cancelar
        </Button>
        <Button :disabled="busy" @click="submit">
          <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
          {{ isEditing ? 'Salvar alterações' : 'Agendar' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
