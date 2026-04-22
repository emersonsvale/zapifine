<script setup lang="ts">
import { MessageSquare } from 'lucide-vue-next'

const props = defineProps<{
  used: number
  limit: number
  extras: number
  resetAt: string | null
  loading: boolean
}>()

const dateFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return dateFmt.format(d)
}

const pct = computed(() => {
  if (!props.limit) return 0
  return Math.min(100, (props.used / props.limit) * 100)
})

const pctLabel = computed(() => {
  if (!props.limit) return '0%'
  return `${((props.used / props.limit) * 100).toFixed(1)}%`
})

const restantes = computed(() =>
  Math.max(0, (props.limit ?? 0) - (props.used ?? 0)),
)
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2 text-xl">
        <MessageSquare class="h-5 w-5 text-emerald-400" />
        Uso de Mensagens
      </CardTitle>
    </CardHeader>

    <CardContent class="space-y-4">
      <div v-if="loading" class="text-sm text-muted-foreground">
        Carregando...
      </div>

      <template v-else>
        <div class="flex items-center justify-between">
          <span class="text-sm text-muted-foreground">Mensagens utilizadas</span>
          <span class="text-lg font-semibold">
            {{ used.toLocaleString('pt-BR') }}/{{ limit.toLocaleString('pt-BR') }}
          </span>
        </div>

        <div class="space-y-1">
          <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full bg-emerald-500 transition-all"
              :style="{ width: `${pct}%` }"
            />
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-muted-foreground">{{ pctLabel }} utilizado</span>
            <span class="text-emerald-400">
              Restam {{ restantes.toLocaleString('pt-BR') }}
            </span>
          </div>
        </div>

        <div class="space-y-3 pt-2 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Reinicia em:</span>
            <span class="font-medium">{{ fmtDate(resetAt) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Mensagens extras:</span>
            <span class="font-semibold">{{ extras.toLocaleString('pt-BR') }}</span>
          </div>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
