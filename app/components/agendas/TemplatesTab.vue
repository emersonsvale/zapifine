<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Plus, Trash2, Loader2, MessageSquare, Bell } from 'lucide-vue-next'
import type { TemplateChannel, TemplateKind } from '~/composables/useAgendaTemplates'

const { templates, pending, load, create, update, remove } = useAgendaTemplates()
const { toast, confirm } = useAlerts()

const newTpl = ref({
  channel: 'whatsapp' as TemplateChannel,
  kind: 'lembrete' as TemplateKind,
  minutes_before: '60',
  title: '',
  body: '',
})

const saving = ref(false)
const editingBody = ref<Record<string, string>>({})

onMounted(async () => {
  try {
    await load()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao carregar.')
  }
})

const KIND_LABELS: Record<TemplateKind, string> = {
  lembrete: 'Lembrete',
  confirmacao: 'Confirmação',
  cancelamento: 'Cancelamento',
  novo_agendamento: 'Novo agendamento',
}

const PLACEHOLDERS = '{title} {when} {minutes_before} {link} {meet_link} {linkLine} {lead_name} {empresa} {atendente} {location} {description}'

async function onCreate() {
  if (!newTpl.value.body.trim()) {
    toast.error('Corpo é obrigatório.')
    return
  }
  saving.value = true
  try {
    await create({
      channel: newTpl.value.channel,
      kind: newTpl.value.kind,
      minutes_before:
        newTpl.value.kind === 'lembrete' && newTpl.value.minutes_before
          ? Number(newTpl.value.minutes_before)
          : null,
      title: newTpl.value.title.trim() || null,
      body: newTpl.value.body.trim(),
    })
    newTpl.value.title = ''
    newTpl.value.body = ''
    toast.success('Template criado.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao criar.')
  } finally {
    saving.value = false
  }
}

async function onSaveBody(id: string) {
  const body = editingBody.value[id]
  if (body === undefined) return
  try {
    await update(id, { body })
    delete editingBody.value[id]
    toast.success('Template salvo.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao salvar.')
  }
}

async function onToggle(id: string, ativo: boolean) {
  try {
    await update(id, { ativo: !ativo })
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha.')
  }
}

async function onDelete(id: string) {
  const ok = await confirm({
    title: 'Remover template',
    description: 'Voltará a usar o texto padrão.',
    variant: 'danger',
    confirmLabel: 'Remover',
  })
  if (!ok) return
  try {
    await remove(id)
    toast.success('Removido.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha.')
  }
}
</script>

<template>
  <div class="space-y-4">
    <Card class="p-4">
      <div class="mb-3">
        <h3 class="text-lg font-semibold">Templates de mensagens</h3>
        <p class="text-sm text-muted-foreground">
          Personalize textos de WhatsApp e notificações in-app. Sem template = usa texto padrão.
        </p>
        <p class="mt-2 text-xs text-muted-foreground">
          Variáveis: <code>{{ PLACEHOLDERS }}</code>
        </p>
      </div>

      <div class="grid gap-3 md:grid-cols-[1fr_1fr_1fr] mb-3">
        <div class="space-y-1">
          <Label class="text-xs">Canal</Label>
          <Select v-model="newTpl.channel">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="app">App (in-app)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1">
          <Label class="text-xs">Tipo</Label>
          <Select v-model="newTpl.kind">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lembrete">Lembrete</SelectItem>
              <SelectItem value="confirmacao">Confirmação</SelectItem>
              <SelectItem value="cancelamento">Cancelamento</SelectItem>
              <SelectItem value="novo_agendamento">Novo agendamento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1">
          <Label class="text-xs">
            Minutos antes <span v-if="newTpl.kind !== 'lembrete'" class="text-muted-foreground">(só lembrete)</span>
          </Label>
          <Input
            v-model="newTpl.minutes_before"
            type="number"
            min="1"
            placeholder="60"
            :disabled="newTpl.kind !== 'lembrete'"
          />
        </div>
      </div>

      <div class="space-y-2 mb-3">
        <Label class="text-xs">Título (opcional, principalmente notif app)</Label>
        <Input v-model="newTpl.title" placeholder="Ex: Lembrete em {minutes_before} min" />
      </div>

      <div class="space-y-2 mb-3">
        <Label class="text-xs">Corpo</Label>
        <textarea
          v-model="newTpl.body"
          rows="4"
          placeholder="*{title}* em {when}{linkLine}"
          class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <Button :disabled="saving" @click="onCreate">
        <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
        <Plus v-else class="h-4 w-4" />
        Adicionar template
      </Button>
    </Card>

    <div v-if="pending" class="text-center text-sm text-muted-foreground py-6">
      Carregando...
    </div>

    <div v-else-if="!templates.length" class="text-center text-sm text-muted-foreground py-6">
      Nenhum template cadastrado. Sistema usa textos padrão.
    </div>

    <Card v-for="t in templates" :key="t.id" class="p-4 space-y-2">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2">
          <component
            :is="t.channel === 'whatsapp' ? MessageSquare : Bell"
            class="h-4 w-4 text-muted-foreground"
          />
          <span class="font-semibold">
            {{ t.channel === 'whatsapp' ? 'WhatsApp' : 'App' }} ·
            {{ KIND_LABELS[t.kind as TemplateKind] }}
          </span>
          <span
            v-if="t.minutes_before"
            class="rounded-full bg-muted/40 px-2 py-0.5 text-xs"
          >
            {{ t.minutes_before }} min antes
          </span>
          <span
            class="rounded-full px-2 py-0.5 text-xs"
            :class="t.ativo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-muted/40 text-muted-foreground'"
          >
            {{ t.ativo ? 'Ativo' : 'Inativo' }}
          </span>
        </div>
        <div class="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            @click="onToggle(t.id, t.ativo ?? true)"
          >
            {{ t.ativo ? 'Desativar' : 'Ativar' }}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="text-destructive"
            @click="onDelete(t.id)"
          >
            <Trash2 class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div v-if="t.title" class="text-sm font-medium">{{ t.title }}</div>

      <textarea
        :value="editingBody[t.id] ?? t.body"
        rows="3"
        class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        @input="(e) => editingBody[t.id] = (e.target as HTMLTextAreaElement).value"
      />

      <div v-if="editingBody[t.id] !== undefined" class="flex justify-end gap-2">
        <Button variant="outline" size="sm" @click="delete editingBody[t.id]">
          Cancelar
        </Button>
        <Button size="sm" @click="onSaveBody(t.id)">
          Salvar
        </Button>
      </div>
    </Card>
  </div>
</template>
