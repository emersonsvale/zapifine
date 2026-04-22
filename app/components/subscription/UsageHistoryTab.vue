<script setup lang="ts">
import type { Database } from '~~/types/database'

type Uso = Database['public']['Tables']['plan_uso_mensal']['Row']

const props = defineProps<{
  historico: Uso[]
  limite: number
  loading: boolean
}>()

const dateFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return dateFmt.format(d)
}

function pct(used: number | null | undefined) {
  if (!props.limite) return 0
  return Math.min(100, ((used ?? 0) / props.limite) * 100)
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-2xl">Histórico Mensal de Uso</CardTitle>
      <CardDescription>
        Acompanhe o uso de mensagens nos últimos meses
      </CardDescription>
    </CardHeader>

    <CardContent>
      <div v-if="loading" class="py-6 text-sm text-muted-foreground">
        Carregando...
      </div>
      <p
        v-else-if="!historico.length"
        class="py-6 text-sm text-muted-foreground"
      >
        Sem histórico de uso.
      </p>
      <ul v-else class="space-y-5">
        <li v-for="u in historico" :key="u.id" class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium">{{ fmtDate(u.mes) }}</span>
            <span class="text-muted-foreground">
              {{ (u.total_mensagens ?? 0).toLocaleString('pt-BR') }}/{{
                limite.toLocaleString('pt-BR')
              }}
            </span>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full bg-emerald-500"
              :style="{ width: `${pct(u.total_mensagens)}%` }"
            />
          </div>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
