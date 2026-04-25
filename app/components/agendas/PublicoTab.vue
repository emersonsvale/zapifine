<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Loader2, Copy, Check, ExternalLink } from 'lucide-vue-next'

type Config = {
  id: string
  name: string
  agenda_publico_slug: string | null
  agenda_publico_ativo: boolean | null
  agenda_publico_titulo: string | null
  agenda_publico_descricao: string | null
}

const config = ref<Config | null>(null)
const loading = ref(true)
const saving = ref(false)
const copied = ref(false)

const form = ref({
  slug: '',
  ativo: false,
  titulo: '',
  descricao: '',
})

const { toast } = useAlerts()

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ config: Config }>('/api/admin/agenda-publico/config')
    config.value = res.config
    form.value.slug = res.config.agenda_publico_slug ?? ''
    form.value.ativo = res.config.agenda_publico_ativo ?? false
    form.value.titulo = res.config.agenda_publico_titulo ?? ''
    form.value.descricao = res.config.agenda_publico_descricao ?? ''
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao carregar.')
  } finally {
    loading.value = false
  }
}

onMounted(load)

const publicUrl = computed(() => {
  if (!form.value.slug) return null
  if (!import.meta.client) return null
  return `${window.location.origin}/agendamento/${form.value.slug}`
})

async function onSave() {
  saving.value = true
  try {
    await $fetch('/api/admin/agenda-publico/config', {
      method: 'POST',
      body: {
        agenda_publico_slug: form.value.slug.trim() || null,
        agenda_publico_ativo: form.value.ativo,
        agenda_publico_titulo: form.value.titulo.trim() || null,
        agenda_publico_descricao: form.value.descricao.trim() || null,
      },
    })
    toast.success('Configuração salva.')
    await load()
  } catch (err) {
    const msg = (err as { data?: { statusMessage?: string }; message?: string })?.data?.statusMessage
      ?? (err instanceof Error ? err.message : 'Falha.')
    toast.error(msg)
  } finally {
    saving.value = false
  }
}

async function onCopy() {
  if (!publicUrl.value) return
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    toast.error('Falha ao copiar.')
  }
}

function suggestSlug() {
  if (!config.value?.name) return
  const s = config.value.name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  form.value.slug = s
}
</script>

<template>
  <div class="space-y-4">
    <Card class="p-4">
      <h3 class="text-lg font-semibold">Página pública de agendamento</h3>
      <p class="text-sm text-muted-foreground">
        Compartilhe um link para que leads agendem horários disponíveis com seus atendentes.
      </p>
    </Card>

    <Card v-if="loading" class="p-8 text-center">
      <Loader2 class="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
    </Card>

    <Card v-else class="p-4 space-y-4">
      <div class="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2">
        <input
          id="ativo"
          v-model="form.ativo"
          type="checkbox"
          class="h-4 w-4 accent-primary"
        />
        <label for="ativo" class="text-sm cursor-pointer">
          Ativar página pública
        </label>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label>Slug do link</Label>
          <Button variant="ghost" size="sm" @click="suggestSlug">
            Sugerir
          </Button>
        </div>
        <div class="flex gap-2">
          <span class="flex items-center px-2 text-sm text-muted-foreground">
            /agendamento/
          </span>
          <Input
            v-model="form.slug"
            placeholder="vale-apps"
            class="flex-1"
          />
        </div>
        <p class="text-xs text-muted-foreground">
          Apenas letras minúsculas, números e hífen. Sem espaço.
        </p>
      </div>

      <div class="space-y-1.5">
        <Label>Título (opcional)</Label>
        <Input
          v-model="form.titulo"
          placeholder="Ex: Agende uma reunião"
        />
      </div>

      <div class="space-y-1.5">
        <Label>Descrição (opcional)</Label>
        <textarea
          v-model="form.descricao"
          rows="3"
          placeholder="Texto que aparece no topo da página"
          class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div v-if="publicUrl && form.ativo" class="rounded-md border bg-emerald-500/5 border-emerald-500/30 p-3 space-y-2">
        <Label class="text-xs">Link público</Label>
        <div class="flex items-center gap-2">
          <code class="flex-1 rounded bg-muted/40 px-2 py-1 text-xs break-all">
            {{ publicUrl }}
          </code>
          <Button variant="ghost" size="icon" title="Copiar" @click="onCopy">
            <Check v-if="copied" class="h-4 w-4 text-emerald-400" />
            <Copy v-else class="h-4 w-4" />
          </Button>
          <Button as-child variant="ghost" size="icon" title="Abrir">
            <a :href="publicUrl" target="_blank" rel="noopener">
              <ExternalLink class="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <Button :disabled="saving" @click="onSave">
        <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
        Salvar
      </Button>
    </Card>
  </div>
</template>
