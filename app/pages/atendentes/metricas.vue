<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { ArrowLeft, Loader2, Activity, DollarSign, Zap, Clock, AlertTriangle } from 'lucide-vue-next'

useHead({ title: 'Métricas IA - Zapifine' })

type Summary = {
  period_days: number
  total_runs: number
  total_tokens_input: number
  total_tokens_output: number
  total_cost_usd: number
  avg_latency_ms: number
  error_count: number
  error_rate: number
  top_tools: Array<{ name: string; count: number }>
  daily: Array<{ day: string; runs: number; cost: number; tokens: number }>
}

type Run = {
  id: string
  agent_id: string | null
  role: string | null
  prompt_tokens: number | null
  completion_tokens: number | null
  cost_usd: string | null
  latency_ms: number | null
  tools_called: Array<{ name: string; result: { ok: boolean } }> | null
  error: string | null
  created_at: string
  conversa_id: number | null
}

const days = ref(30)
const loading = ref(true)
const summary = ref<Summary | null>(null)
const runs = ref<Run[]>([])

async function refresh() {
  loading.value = true
  try {
    const [s, r] = await Promise.all([
      $fetch<Summary>(`/api/ai/metrics/summary`, { query: { days: days.value } }),
      $fetch<{ runs: Run[] }>(`/api/ai/metrics/recent`, { query: { limit: 50 } }),
    ])
    summary.value = s
    runs.value = r.runs ?? []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
watch(days, () => refresh())

const totalTokens = computed(() => (summary.value ? summary.value.total_tokens_input + summary.value.total_tokens_output : 0))
const brlRate = 5.4 // aproximação
const costBrl = computed(() => (summary.value ? (summary.value.total_cost_usd * brlRate).toFixed(2) : '0.00'))
const maxDaily = computed(() => (summary.value?.daily?.length ? Math.max(...summary.value.daily.map((d) => d.runs), 1) : 1))

function pct(v: number, max: number) {
  return Math.max(2, Math.round((v / max) * 100))
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtDay(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}`
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 md:p-6">
    <div class="mb-4 flex items-center gap-2">
      <Button variant="ghost" size="icon" @click="navigateTo('/atendentes')">
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <div class="flex-1">
        <h1 class="text-xl font-semibold">Métricas IA</h1>
        <p class="text-xs text-muted-foreground">Uso, custo e desempenho dos agentes.</p>
      </div>
      <select
        v-model.number="days"
        class="rounded-md border border-input bg-background px-2 py-1 text-sm"
      >
        <option :value="7">7 dias</option>
        <option :value="30">30 dias</option>
        <option :value="90">90 dias</option>
      </select>
    </div>

    <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 class="h-4 w-4 animate-spin" /> Carregando…
    </div>

    <template v-else-if="summary">
      <div class="mb-4 grid gap-3 md:grid-cols-4">
        <Card class="p-3">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity class="h-3.5 w-3.5" /> Respostas geradas
          </div>
          <div class="mt-1 text-2xl font-semibold">{{ summary.total_runs }}</div>
        </Card>
        <Card class="p-3">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign class="h-3.5 w-3.5" /> Custo
          </div>
          <div class="mt-1 text-2xl font-semibold">
            R$ {{ costBrl }}
          </div>
          <div class="text-xs text-muted-foreground">US$ {{ summary.total_cost_usd }}</div>
        </Card>
        <Card class="p-3">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap class="h-3.5 w-3.5" /> Tokens
          </div>
          <div class="mt-1 text-2xl font-semibold">{{ totalTokens.toLocaleString('pt-BR') }}</div>
          <div class="text-xs text-muted-foreground">
            {{ summary.total_tokens_input.toLocaleString('pt-BR') }} in · {{ summary.total_tokens_output.toLocaleString('pt-BR') }} out
          </div>
        </Card>
        <Card class="p-3">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock class="h-3.5 w-3.5" /> Latência média
          </div>
          <div class="mt-1 text-2xl font-semibold">{{ summary.avg_latency_ms }}ms</div>
          <div v-if="summary.error_count > 0" class="mt-1 flex items-center gap-1 text-xs text-red-600">
            <AlertTriangle class="h-3 w-3" />
            {{ summary.error_count }} erro(s) · {{ (summary.error_rate * 100).toFixed(1) }}%
          </div>
        </Card>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle class="text-sm">Uso por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="summary.daily.length === 0" class="text-xs text-muted-foreground">Sem dados no período.</div>
            <div v-else class="space-y-1.5">
              <div v-for="d in summary.daily" :key="d.day" class="flex items-center gap-2 text-xs">
                <span class="w-14 text-muted-foreground">{{ fmtDay(d.day) }}</span>
                <div class="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                  <div class="h-full bg-primary" :style="{ width: `${pct(d.runs, maxDaily)}%` }" />
                </div>
                <span class="w-16 text-right tabular-nums">{{ d.runs }} req</span>
                <span class="w-20 text-right tabular-nums text-muted-foreground">${{ d.cost.toFixed(3) }}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-sm">Tools mais usadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="summary.top_tools.length === 0" class="text-xs text-muted-foreground">
              Nenhuma tool chamada ainda.
            </div>
            <div v-else class="space-y-1.5">
              <div v-for="t in summary.top_tools" :key="t.name" class="flex items-center gap-2 text-xs">
                <span class="flex-1 truncate font-mono">{{ t.name }}</span>
                <span class="tabular-nums text-muted-foreground">{{ t.count }}x</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card class="mt-3">
        <CardHeader>
          <CardTitle class="text-sm">Últimas execuções</CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="runs.length === 0" class="text-xs text-muted-foreground">Sem execuções.</div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="text-muted-foreground">
                <tr class="border-b">
                  <th class="py-1.5 text-left">Quando</th>
                  <th class="py-1.5 text-left">Role</th>
                  <th class="py-1.5 text-right">Tokens</th>
                  <th class="py-1.5 text-right">Custo</th>
                  <th class="py-1.5 text-right">Latência</th>
                  <th class="py-1.5 text-left">Erro</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in runs" :key="r.id" class="border-b last:border-0">
                  <td class="py-1.5">{{ fmtDate(r.created_at) }}</td>
                  <td class="py-1.5 font-mono">{{ r.role ?? '-' }}</td>
                  <td class="py-1.5 text-right tabular-nums">
                    {{ (r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0) }}
                  </td>
                  <td class="py-1.5 text-right tabular-nums">
                    ${{ Number(r.cost_usd ?? 0).toFixed(5) }}
                  </td>
                  <td class="py-1.5 text-right tabular-nums">{{ r.latency_ms ?? 0 }}ms</td>
                  <td class="py-1.5 truncate max-w-[280px]" :class="r.error ? 'text-red-600' : 'text-muted-foreground'">
                    {{ r.error ?? '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
