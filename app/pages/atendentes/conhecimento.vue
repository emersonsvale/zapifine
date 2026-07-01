<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ArrowLeft, BookOpen, Loader2, Trash2, Upload } from 'lucide-vue-next'

useHead({ title: 'Base de conhecimento - Zapifine' })

type Source = {
  source_ref: string
  title: string
  chunks: number
  created_at: string
}

const sources = ref<Source[]>([])
const loading = ref(true)
const saving = ref(false)
const feedback = ref<{ kind: 'ok' | 'err'; text: string } | null>(null)

const form = ref({ title: '', content_text: '' })
const uploading = ref(false)
const fileTitle = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function notify(kind: 'ok' | 'err', text: string) {
  feedback.value = { kind, text }
  setTimeout(() => (feedback.value = null), 4000)
}

async function refresh() {
  loading.value = true
  try {
    const res = await $fetch<{ sources: Source[] }>('/api/ai/knowledge/sources')
    sources.value = res.sources ?? []
  } catch (err) {
    notify('err', err instanceof Error ? err.message : 'Erro')
  } finally {
    loading.value = false
  }
}

onMounted(refresh)

async function handleAdd() {
  if (!form.value.title.trim() || form.value.content_text.trim().length < 20) {
    notify('err', 'Título e texto (mín 20 chars) obrigatórios')
    return
  }
  saving.value = true
  try {
    const res = await $fetch<{ chunks: number }>('/api/ai/knowledge', {
      method: 'POST',
      body: form.value,
    })
    notify('ok', `Adicionado — ${res.chunks} trecho(s)`)
    form.value = { title: '', content_text: '' }
    await refresh()
  } catch (err) {
    notify('err', err instanceof Error ? err.message : 'Erro ao salvar')
  } finally {
    saving.value = false
  }
}

async function handleUpload() {
  const input = fileInput.value
  const file = input?.files?.[0]
  if (!file) {
    notify('err', 'Selecione um arquivo')
    return
  }
  if (!fileTitle.value.trim()) {
    notify('err', 'Título obrigatório')
    return
  }
  const fd = new FormData()
  fd.append('title', fileTitle.value.trim())
  fd.append('file', file)
  uploading.value = true
  try {
    const res = await $fetch<{ chunks: number; filename: string }>('/api/ai/knowledge/upload', {
      method: 'POST',
      body: fd,
    })
    notify('ok', `${res.filename} adicionado — ${res.chunks} trecho(s)`)
    fileTitle.value = ''
    if (input) input.value = ''
    await refresh()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao fazer upload'
    notify('err', msg)
  } finally {
    uploading.value = false
  }
}

async function handleRemove(s: Source) {
  if (!confirm(`Remover "${s.title}"?`)) return
  try {
    await $fetch(`/api/ai/knowledge/${encodeURIComponent(s.source_ref)}`, { method: 'DELETE' })
    notify('ok', 'Removido')
    await refresh()
  } catch (err) {
    notify('err', err instanceof Error ? err.message : 'Erro ao remover')
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl p-4 md:p-6">
    <div class="mb-4 flex items-center gap-2">
      <Button variant="ghost" size="icon" @click="navigateTo('/atendentes')">
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <div>
        <h1 class="text-xl font-semibold">Base de conhecimento</h1>
        <p class="text-xs text-muted-foreground">
          Textos que os agentes IA usam via busca semântica (habilite a tool "buscar_conhecimento").
        </p>
      </div>
    </div>

    <div
      v-if="feedback"
      :class="[
        'mb-4 rounded-md border px-3 py-2 text-sm',
        feedback.kind === 'ok'
          ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200'
          : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200',
      ]"
    >
      {{ feedback.text }}
    </div>

    <Card class="mb-4">
      <CardHeader>
        <div class="flex items-center gap-2">
          <Upload class="h-4 w-4" />
          <CardTitle class="text-base">Upload de arquivo (PDF, TXT, MD)</CardTitle>
        </div>
        <CardDescription>Envie documentos. O texto é extraído e chunked automaticamente.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div>
          <Label>Título</Label>
          <Input v-model="fileTitle" placeholder="Ex: Catálogo de produtos 2026" />
        </div>
        <div>
          <Label>Arquivo</Label>
          <input
            ref="fileInput"
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            class="block w-full text-sm"
          />
        </div>
        <div class="flex justify-end">
          <Button @click="handleUpload" :disabled="uploading">
            <Loader2 v-if="uploading" class="h-4 w-4 animate-spin" />
            <Upload v-else class="h-4 w-4" />
            Enviar arquivo
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card class="mb-6">
      <CardHeader>
        <div class="flex items-center gap-2">
          <Upload class="h-4 w-4" />
          <CardTitle class="text-base">Adicionar texto</CardTitle>
        </div>
        <CardDescription>
          Cole o texto abaixo (FAQ, produtos, políticas). O sistema divide em trechos e cria embeddings automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div>
          <Label>Título</Label>
          <Input v-model="form.title" placeholder="Ex: Política de trocas 2026" />
        </div>
        <div>
          <Label>Texto</Label>
          <textarea
            v-model="form.content_text"
            rows="10"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
            placeholder="Cole aqui o conteúdo…"
          />
        </div>
        <div class="flex justify-end">
          <Button @click="handleAdd" :disabled="saving">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            <Upload v-else class="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>

    <div class="mb-3 flex items-center gap-2 text-sm font-medium">
      <BookOpen class="h-4 w-4" />
      Fontes cadastradas
    </div>

    <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 class="h-4 w-4 animate-spin" /> Carregando…
    </div>

    <div v-else-if="sources.length === 0" class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      Nenhuma fonte ainda.
    </div>

    <div v-else class="space-y-2">
      <Card v-for="s in sources" :key="s.source_ref" class="p-3">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="truncate font-medium text-sm">{{ s.title }}</div>
            <div class="text-xs text-muted-foreground">
              {{ s.chunks }} trecho(s) · {{ new Date(s.created_at).toLocaleString('pt-BR') }}
            </div>
          </div>
          <Button variant="ghost" size="icon" @click="handleRemove(s)" title="Remover">
            <Trash2 class="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </Card>
    </div>
  </div>
</template>
