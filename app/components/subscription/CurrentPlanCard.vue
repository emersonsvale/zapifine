<script setup lang="ts">
import { Crown } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Plan = Database['public']['Tables']['plan']['Row']
type PlanAssinado = Database['public']['Tables']['plan_assinados']['Row']

const props = defineProps<{
  subscription: (PlanAssinado & { plan: Plan | null }) | null
  proximaCobranca: string | null
  loading: boolean
}>()

const dateFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })
const moneyFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return dateFmt.format(d)
}

const statusLabel = computed(() => {
  const s = props.subscription
  if (!s) return 'Sem plano'
  if (s.trial) return 'Trial'
  if (s.ativo) return 'Ativo'
  return 'Inativo'
})

const statusClass = computed(() => {
  const s = props.subscription
  if (!s) return 'bg-muted text-muted-foreground'
  if (s.ativo) return 'bg-emerald-500/90 text-emerald-950'
  return 'bg-muted text-muted-foreground'
})

const valorMensal = computed(() => {
  const v = props.subscription?.plan?.valor_mensal
  if (v == null) return '—'
  return moneyFmt.format(Number(v))
})
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-center justify-between gap-4">
        <CardTitle class="flex items-center gap-2 text-xl">
          <Crown class="h-5 w-5 text-amber-300" />
          Plano Atual
        </CardTitle>
      </div>
    </CardHeader>

    <CardContent class="space-y-5">
      <div v-if="loading" class="text-sm text-muted-foreground">
        Carregando...
      </div>

      <template v-else>
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-2xl font-semibold">
              {{ subscription?.plan?.nome ?? 'Nenhum plano ativo' }}
            </p>
            <p class="text-sm text-muted-foreground">
              {{ valorMensal }}<span v-if="subscription">/ Mensal</span>
            </p>
          </div>
          <span
            class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
            :class="statusClass"
          >
            {{ statusLabel }}
          </span>
        </div>

        <div class="space-y-3 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Data de início:</span>
            <span class="font-medium">{{ fmtDate(subscription?.data_inicio) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Próxima cobrança:</span>
            <span class="font-medium">{{ fmtDate(proximaCobranca) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Renovação automática:</span>
            <span class="font-semibold">
              {{ subscription?.recorrente ? 'Ativada' : 'Desativada' }}
            </span>
          </div>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
