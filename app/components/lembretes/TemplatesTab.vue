<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Pencil, Trash2 } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Template = Database['public']['Tables']['lembretes_templates']['Row']

const { templates, templatesPending, updateTemplate, deleteTemplate } =
  useLembretes()
const { toast, confirm } = useAlerts()

const dialogOpen = ref(false)
const editing = ref<Template | null>(null)

function openNew() {
  editing.value = null
  dialogOpen.value = true
}

function openEdit(t: Template) {
  editing.value = t
  dialogOpen.value = true
}

async function toggleAtivo(t: Template) {
  try {
    await updateTemplate(t.id, { ativo: !t.ativo })
    toast.success(t.ativo ? 'Template desativado.' : 'Template ativado.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao alterar status.')
  }
}

async function onDelete(t: Template) {
  const ok = await confirm({
    title: 'Excluir template',
    description: `Tem certeza que deseja excluir "${t.titulo ?? t.id}"? Esta ação não pode ser desfeita.`,
    confirmLabel: 'Excluir',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await deleteTemplate(t.id)
    toast.success('Template excluído.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao excluir.')
  }
}
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row items-center justify-between space-y-0">
      <div>
        <CardTitle class="text-2xl">Templates</CardTitle>
        <CardDescription>
          Gerencie os modelos de mensagens dos seus lembretes
        </CardDescription>
      </div>
      <Button @click="openNew">
        <Plus class="h-4 w-4" />
        Novo Template
      </Button>
    </CardHeader>

    <CardContent>
      <div
        v-if="templatesPending"
        class="py-10 text-center text-sm text-muted-foreground"
      >
        Carregando...
      </div>

      <div
        v-else-if="!templates?.length"
        class="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40">
          <ZapifineLogo :size="28" />
        </div>
        Nenhum template criado.
      </div>

      <div v-else class="grid gap-4 md:grid-cols-2">
        <div
          v-for="t in templates"
          :key="t.id"
          class="flex flex-col rounded-lg border bg-card/50 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <p class="truncate text-base font-semibold">
              {{ t.titulo ?? `Template #${t.id}` }}
            </p>
            <div class="flex items-center gap-2">
              <span
                class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {{ t.tipo_lembrete ?? 'tipo' }}
              </span>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="
                  t.ativo
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-red-500/15 text-red-300'
                "
              >
                {{ t.ativo ? 'Ativo' : 'Desativado' }}
              </span>
            </div>
          </div>

          <p class="mt-1 text-xs text-muted-foreground">Template para lembretes</p>

          <div class="mt-3 flex-1 rounded-md border bg-background/40 p-3 text-sm">
            <p class="whitespace-pre-wrap text-muted-foreground">
              {{ t.mensagem ?? '[texto]' }}
            </p>
          </div>

          <div class="mt-3 flex items-center justify-between">
            <div class="flex items-center gap-1">
              <Button variant="outline" size="sm" @click="openEdit(t)">
                <Pencil class="h-3.5 w-3.5" />
                Editar
              </Button>
              <Button variant="ghost" size="icon" @click="onDelete(t)">
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <button
              type="button"
              class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
              :class="t.ativo ? 'bg-emerald-500' : 'bg-muted'"
              @click="toggleAtivo(t)"
            >
              <span
                class="inline-block h-4 w-4 rounded-full bg-white transition-transform"
                :class="t.ativo ? 'translate-x-4' : 'translate-x-0.5'"
              />
            </button>
          </div>
        </div>
      </div>
    </CardContent>

    <LembretesTemplateDialog v-model:open="dialogOpen" :template="editing" />
  </Card>
</template>
