<script setup lang="ts">
import { Download } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Cobranca = Database['public']['Tables']['cobrancas']['Row']

const props = defineProps<{
  faturas: Cobranca[]
  loading: boolean
}>()

const dateFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })
const moneyFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function fmtDate(iso?: string | null) {
  if (!iso) return '00/00/0000'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '00/00/0000'
  return dateFmt.format(d)
}

function fmtMoney(v: number | null | undefined) {
  if (v == null) return '—'
  return moneyFmt.format(Number(v))
}

function statusLabel(s: string | null | undefined) {
  if (!s) return 'Pendente'
  const low = s.toLowerCase()
  if (['paid', 'pago', 'confirmed', 'received'].includes(low)) return 'Pago'
  if (['overdue', 'atrasado'].includes(low)) return 'Atrasado'
  return 'Pendente'
}

function statusClass(s: string | null | undefined) {
  const l = statusLabel(s)
  if (l === 'Pago') return 'text-emerald-400'
  if (l === 'Atrasado') return 'text-destructive'
  return 'text-muted-foreground'
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-2xl">Histórico de Faturas</CardTitle>
      <CardDescription>
        Visualize e faça download das suas faturas
      </CardDescription>
    </CardHeader>

    <CardContent>
      <div v-if="loading" class="py-6 text-sm text-muted-foreground">
        Carregando...
      </div>
      <p
        v-else-if="!faturas.length"
        class="py-6 text-sm text-muted-foreground"
      >
        Nenhuma fatura emitida.
      </p>
      <ul v-else class="space-y-3">
        <li
          v-for="f in faturas"
          :key="f.id"
          class="flex items-center justify-between rounded-lg border bg-card/50 px-4 py-3"
        >
          <div>
            <p class="text-sm font-semibold">Fatura #{{ f.id }}</p>
            <p class="text-xs text-muted-foreground">
              {{ fmtDate(f.vencimento ?? f.mes_referencia ?? f.created_at) }}
            </p>
          </div>

          <div class="flex items-center gap-4">
            <div class="text-right">
              <p class="text-sm font-semibold">
                {{ fmtMoney(f.valor_total ?? f.valor_plano) }}
              </p>
              <p class="text-xs" :class="statusClass(f.status_asaas)">
                {{ statusLabel(f.status_asaas) }}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              :disabled="!f.invoice_url && !f.link_pagamento"
              as-child
            >
              <a
                :href="f.invoice_url ?? f.link_pagamento ?? '#'"
                target="_blank"
                rel="noopener"
              >
                <Download class="h-4 w-4" />
                Download
              </a>
            </Button>
          </div>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
