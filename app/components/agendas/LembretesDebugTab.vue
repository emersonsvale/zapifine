<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RefreshCw, RotateCcw, Loader2 } from 'lucide-vue-next'

type LembreteRow = {
  id: string
  agendamento_id: string
  fire_at: string
  channel: string
  target: string | null
  payload: Record<string, unknown> | null
  status: string
  attempts: number
  last_error: string | null
  sent_at: string | null
  created_at: string
  agendamentos: { gg_title: string | null; gg_start: string | null }
}

type Stats = { pending: number; sent: number; failed: number; skipped: number }

const lembretes = ref<LembreteRow[]>([])
const stats = ref<Stats>({ pending: 0, sent: 0, failed: 0, skipped: 0 })
const loading = ref(false)
const filter = ref<'all' | 'pending' | 'sent' | 'failed' | 'skipped'>('all')

const { toast } = useAlerts()

async function load() {
  loading.value = true
  try {
    const query = filter.value === 'all' ? {} : { status: filter.value }
    const res = await $fetch<{ lembretes: LembreteRow[]; stats: Stats }>(
      '/api/admin/lembretes',
      { query },
    )
    lembretes.value = res.lembretes
    stats.value = res.stats
  } catch (err) {
    const msg = (err as { data?: { statusMessage?: string }; message?: string })
      ?.data?.statusMessage
      ?? (err instanceof Error ? err.message : 'Falha ao carregar.')
    toast.error(msg)
  } finally {
    loading.value = false
  }
}

async function onRetry(id: string) {
  try {
    await $fetch(`/api/admin/lembretes/${encodeURIComponent(id)}/retry`, {
      method: 'POST',
    })
    toast.success('Lembrete enfileirado para retry.')
    await load()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha.')
  }
}

onMounted(load)

function fmtDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300',
  sent: 'bg-emerald-500/15 text-emerald-300',
  failed: 'bg-red-500/15 text-red-300',
  skipped: 'bg-muted/40 text-muted-foreground',
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card class="p-3">
        <p class="text-xs text-muted-foreground">Pendentes</p>
        <p class="text-2xl font-bold text-amber-400">{{ stats.pending }}</p>
      </Card>
      <Card class="p-3">
        <p class="text-xs text-muted-foreground">Enviados</p>
        <p class="text-2xl font-bold text-emerald-400">{{ stats.sent }}</p>
      </Card>
      <Card class="p-3">
        <p class="text-xs text-muted-foreground">Falhados</p>
        <p class="text-2xl font-bold text-red-400">{{ stats.failed }}</p>
      </Card>
      <Card class="p-3">
        <p class="text-xs text-muted-foreground">Pulados</p>
        <p class="text-2xl font-bold text-muted-foreground">{{ stats.skipped }}</p>
      </Card>
    </div>

    <Card class="p-4">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div class="flex items-center gap-2">
          <Label>Filtro:</Label>
          <Select v-model="filter" @update:modelValue="load">
            <SelectTrigger class="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="sent">Enviados</SelectItem>
              <SelectItem value="failed">Falhados</SelectItem>
              <SelectItem value="skipped">Pulados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" :disabled="loading" @click="load">
          <RefreshCw class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
          Atualizar
        </Button>
      </div>

      <div
        v-if="loading"
        class="py-8 text-center text-sm text-muted-foreground"
      >
        Carregando...
      </div>

      <div
        v-else-if="!lembretes.length"
        class="py-8 text-center text-sm text-muted-foreground"
      >
        Nenhum lembrete encontrado.
      </div>

      <ul v-else class="divide-y">
        <li
          v-for="l in lembretes"
          :key="l.id"
          class="grid grid-cols-[100px_120px_1fr_100px_auto] items-center gap-3 py-3 text-sm"
        >
          <span
            class="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium"
            :class="STATUS_CLASS[l.status] ?? ''"
          >
            {{ l.status }}
          </span>
          <span class="text-xs">
            {{ l.channel === 'whatsapp' ? '📱 WhatsApp' : '🔔 App' }}
          </span>
          <div class="min-w-0">
            <p class="truncate font-medium">
              {{ l.agendamentos?.gg_title ?? l.agendamento_id }}
            </p>
            <p class="text-xs text-muted-foreground">
              Disparo: {{ fmtDateTime(l.fire_at) }}
              <span v-if="l.sent_at"> · Enviado: {{ fmtDateTime(l.sent_at) }}</span>
              <span v-if="l.attempts > 0"> · {{ l.attempts }} tentativa(s)</span>
            </p>
            <p
              v-if="l.last_error"
              class="text-xs text-red-400 truncate"
              :title="l.last_error"
            >
              ⚠ {{ l.last_error }}
            </p>
          </div>
          <span class="text-xs text-muted-foreground truncate" :title="l.target ?? ''">
            {{ l.target ?? '—' }}
          </span>
          <div>
            <Button
              v-if="l.status === 'failed' || l.status === 'skipped'"
              variant="ghost"
              size="sm"
              title="Retry"
              @click="onRetry(l.id)"
            >
              <RotateCcw class="h-4 w-4" />
            </Button>
          </div>
        </li>
      </ul>
    </Card>
  </div>
</template>
