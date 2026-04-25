<script setup lang="ts">
import { computed } from 'vue'

useHead({ title: 'Dashboard - Zapifine' })

const { stats: statsState, activities: activitiesState } = useDashboardData()

const { data: stats, pending: statsLoading, error: statsError } = statsState
const { data: activities, pending: actLoading } = activitiesState

const cards = computed(() => {
  const s = stats.value
  return [
    {
      label: 'Total de Mensagens',
      value: s?.totalMensagens ?? 0,
      hint: 'todas as mensagens registradas',
      accent: 'emerald' as const,
    },
    {
      label: 'Taxa de Conversão',
      value: `${s?.taxaConversao ?? 0}%`,
      hint: 'leads convertidos',
      accent: 'cyan' as const,
    },
    {
      label: 'Tempo Médio de Resposta',
      value:
        s?.tempoMedioRespostaSeg != null
          ? `${s.tempoMedioRespostaSeg}s`
          : '—',
      hint: 'média entre lead e resposta',
      accent: 'violet' as const,
    },
    {
      label: 'Leads na Semana',
      value: s?.leadsUltimaSemana ?? 0,
      hint: 'últimos 7 dias',
      accent: 'amber' as const,
    },
  ]
})

const metrics = computed(() => {
  const s = stats.value?.statusDesempenho
  return [
    { label: 'Taxa de Resposta', value: s?.taxa_resposta ?? 0, color: 'emerald' as const },
    { label: 'Precisão das Respostas', value: s?.precisao_respostas ?? 0, color: 'blue' as const },
    { label: 'Satisfação do Cliente', value: s?.satisfacao_cliente ?? 0, color: 'emerald' as const },
    { label: 'Taxa de Conclusão', value: s?.taxa_conclusao ?? 0, color: 'blue' as const },
  ]
})

const msgsChart = computed(() => stats.value?.graficoMensagens ?? { labels: [], valores: [] })
const convChart = computed(() => stats.value?.graficoConversao ?? { labels: [], valores: [] })

function pctFormatter(v: number) {
  return `${Math.round(v)}%`
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-semibold tracking-tight">Dashboard</h1>

    <p
      v-if="statsError"
      class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      Não foi possível carregar as estatísticas: {{ statsError.message }}
    </p>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardStatCard
        v-for="s in cards"
        :key="s.label"
        :label="s.label"
        :value="statsLoading ? '…' : s.value"
        :hint="s.hint"
        :accent="s.accent"
      />
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle class="text-xl">Mensagens (5 semanas)</CardTitle>
          <CardDescription>Volume semanal — S5 = semana atual</CardDescription>
        </CardHeader>
        <CardContent>
          <p
            v-if="statsLoading"
            class="py-8 text-center text-sm text-muted-foreground"
          >
            Carregando...
          </p>
          <DashboardLineChart
            v-else
            :labels="msgsChart.labels"
            :values="msgsChart.valores"
            color="#10b981"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-xl">Taxa de Conversão (%)</CardTitle>
          <CardDescription>Leads convertidos por semana</CardDescription>
        </CardHeader>
        <CardContent>
          <p
            v-if="statsLoading"
            class="py-8 text-center text-sm text-muted-foreground"
          >
            Carregando...
          </p>
          <DashboardLineChart
            v-else
            :labels="convChart.labels"
            :values="convChart.valores"
            color="#0ea5e9"
            :y-formatter="pctFormatter"
            :y-max-override="100"
          />
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle class="text-xl">Atividades Recentes</CardTitle>
          <CardDescription>
            Visualize as conversas mais recentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="divide-y">
            <p
              v-if="actLoading"
              class="py-6 text-sm text-muted-foreground"
            >
              Carregando...
            </p>
            <p
              v-else-if="!activities || activities.length === 0"
              class="py-6 text-sm text-muted-foreground"
            >
              Nenhuma atividade recente.
            </p>
            <DashboardActivityItem
              v-for="a in activities ?? []"
              :key="a.id"
              :name="a.name"
              :description="a.description"
              :time="a.time"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-xl">Status de Desempenho</CardTitle>
          <CardDescription>Resumo do desempenho do seu chatbot</CardDescription>
        </CardHeader>
        <CardContent class="space-y-5">
          <div class="space-y-4">
            <DashboardMetricBar
              v-for="m in metrics"
              :key="m.label"
              :label="m.label"
              :value="m.value"
              :color="m.color"
            />
          </div>

          <Separator />

          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-muted-foreground">Mensagens</p>
              <p class="mt-1 text-2xl font-semibold">
                {{ stats?.mensagensEstaSemana ?? 0 }}
              </p>
              <p class="text-xs text-muted-foreground">esta semana</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Mensagens</p>
              <p class="mt-1 text-2xl font-semibold">
                {{ stats?.mensagensSemanaPassada ?? 0 }}
              </p>
              <p class="text-xs text-muted-foreground">semana passada</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
