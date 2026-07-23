<script setup lang="ts">
import { computed } from 'vue'
import {
  CalendarClock,
  Plus,
  Pencil,
  Ban,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Link as LinkIcon,
  FileText,
  CheckCheck,
  AlertTriangle,
  Clock,
} from 'lucide-vue-next'
import type { ScheduledMessage } from '~/composables/useScheduledMessages'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  new: []
  edit: [item: ScheduledMessage]
}>()

const { items, pending, error, refresh, cancel, remove } = useScheduledMessages()
const { toast, confirm } = useAlerts()

const busyId = ref<string | null>(null)

const pendentes = computed(() =>
  items.value.filter((m) => m.status === 'pending'),
)
const historico = computed(() =>
  items.value
    .filter((m) => m.status !== 'pending')
    .slice()
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)),
)

const whenFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatWhen(iso: string) {
  return whenFmt.format(new Date(iso))
}

function relativeWhen(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'enviando...'
  const min = Math.round(diff / 60000)
  if (min < 60) return `em ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `em ${h}h`
  const d = Math.round(h / 24)
  return `em ${d} dia${d === 1 ? '' : 's'}`
}

function preview(m: ScheduledMessage): string {
  if (m.mensagem?.trim()) return m.mensagem.trim()
  if (m.tipo === 'media') return m.midia_nome ?? '[mídia]'
  if (m.tipo === 'link') return m.link_url ?? '[link]'
  return '[sem conteúdo]'
}

const statusLabel: Record<ScheduledMessage['status'], string> = {
  pending: 'Agendada',
  sent: 'Enviada',
  failed: 'Falhou',
  canceled: 'Cancelada',
}

const statusClass: Record<ScheduledMessage['status'], string> = {
  pending: 'bg-sky-500/15 text-sky-600',
  sent: 'bg-emerald-500/15 text-emerald-600',
  failed: 'bg-destructive/15 text-destructive',
  canceled: 'bg-muted text-muted-foreground',
}

async function onCancel(m: ScheduledMessage) {
  const ok = await confirm({
    title: 'Cancelar envio',
    description: 'A mensagem não será enviada. Ela continua listada como cancelada.',
    confirmLabel: 'Cancelar envio',
    variant: 'danger',
  })
  if (!ok) return
  busyId.value = m.id
  try {
    await cancel(m.id)
    toast.success('Agendamento cancelado.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao cancelar.')
  } finally {
    busyId.value = null
  }
}

async function onRemove(m: ScheduledMessage) {
  const ok = await confirm({
    title: 'Excluir da lista',
    description: 'O registro será removido permanentemente.',
    confirmLabel: 'Excluir',
    variant: 'danger',
  })
  if (!ok) return
  busyId.value = m.id
  try {
    await remove(m.id)
    toast.success('Registro removido.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao excluir.')
  } finally {
    busyId.value = null
  }
}

watch(open, (o) => {
  if (o) void refresh()
})
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent side="right" class="w-full overflow-y-auto sm:max-w-md">
      <SheetHeader>
        <SheetTitle class="flex items-center gap-2">
          <CalendarClock class="h-5 w-5" />
          Mensagens agendadas
        </SheetTitle>
        <SheetDescription>
          Enviadas automaticamente na data e hora escolhidas.
        </SheetDescription>
      </SheetHeader>

      <div class="px-4 pb-6">
        <Button class="w-full gap-1.5" @click="emit('new')">
          <Plus class="h-4 w-4" />
          Nova mensagem agendada
        </Button>

        <div
          v-if="pending"
          class="mt-6 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 class="h-4 w-4 animate-spin" />
          Carregando...
        </div>

        <p v-else-if="error" class="mt-6 text-sm text-destructive">{{ error }}</p>

        <div
          v-else-if="items.length === 0"
          class="mt-10 flex flex-col items-center gap-2 text-center"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Clock class="h-6 w-6 text-muted-foreground" />
          </div>
          <p class="text-sm font-medium">Nenhuma mensagem agendada</p>
          <p class="text-xs text-muted-foreground">
            Crie uma mensagem e escolha quando ela deve ser enviada.
          </p>
        </div>

        <template v-else>
          <section v-if="pendentes.length" class="mt-6 space-y-2">
            <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Na fila ({{ pendentes.length }})
            </p>
            <article
              v-for="m in pendentes"
              :key="m.id"
              class="rounded-md border p-3"
            >
              <div class="flex items-start gap-2">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <ImageIcon v-if="m.tipo === 'media' && m.midia_tipo === 'image'" class="h-4 w-4 text-violet-500" />
                  <FileText v-else-if="m.tipo === 'media'" class="h-4 w-4 text-violet-500" />
                  <LinkIcon v-else-if="m.tipo === 'link'" class="h-4 w-4 text-sky-500" />
                  <Clock v-else class="h-4 w-4 text-muted-foreground" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="line-clamp-3 whitespace-pre-wrap break-words text-sm">
                    {{ preview(m) }}
                  </p>
                  <p class="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <CalendarClock class="h-3 w-3" />
                    {{ formatWhen(m.scheduled_at) }}
                    <span class="text-muted-foreground/70">· {{ relativeWhen(m.scheduled_at) }}</span>
                  </p>
                </div>
              </div>
              <div class="mt-2 flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  class="gap-1 text-xs"
                  :disabled="busyId === m.id"
                  @click="emit('edit', m)"
                >
                  <Pencil class="h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  class="gap-1 text-xs text-destructive hover:text-destructive"
                  :disabled="busyId === m.id"
                  @click="onCancel(m)"
                >
                  <Loader2 v-if="busyId === m.id" class="h-3.5 w-3.5 animate-spin" />
                  <Ban v-else class="h-3.5 w-3.5" />
                  Cancelar
                </Button>
              </div>
            </article>
          </section>

          <section v-if="historico.length" class="mt-6 space-y-2">
            <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Histórico
            </p>
            <article
              v-for="m in historico"
              :key="m.id"
              class="rounded-md border border-dashed p-3"
            >
              <div class="flex items-start gap-2">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <CheckCheck v-if="m.status === 'sent'" class="h-4 w-4 text-emerald-500" />
                  <AlertTriangle v-else-if="m.status === 'failed'" class="h-4 w-4 text-destructive" />
                  <Ban v-else class="h-4 w-4 text-muted-foreground" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="line-clamp-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {{ preview(m) }}
                  </p>
                  <p class="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span
                      class="rounded px-1.5 py-0.5 font-medium"
                      :class="statusClass[m.status]"
                    >
                      {{ statusLabel[m.status] }}
                    </span>
                    {{ formatWhen(m.sent_at ?? m.scheduled_at) }}
                  </p>
                  <p v-if="m.last_error" class="mt-1 break-words text-[11px] text-destructive">
                    {{ m.last_error }}
                  </p>
                </div>
              </div>
              <div class="mt-2 flex justify-end gap-1">
                <Button
                  v-if="m.status !== 'sent'"
                  variant="ghost"
                  size="sm"
                  class="gap-1 text-xs"
                  :disabled="busyId === m.id"
                  @click="emit('edit', m)"
                >
                  <Pencil class="h-3.5 w-3.5" />
                  Reagendar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  class="gap-1 text-xs text-destructive hover:text-destructive"
                  :disabled="busyId === m.id"
                  @click="onRemove(m)"
                >
                  <Loader2 v-if="busyId === m.id" class="h-3.5 w-3.5 animate-spin" />
                  <Trash2 v-else class="h-3.5 w-3.5" />
                  Excluir
                </Button>
              </div>
            </article>
          </section>
        </template>
      </div>
    </SheetContent>
  </Sheet>
</template>
