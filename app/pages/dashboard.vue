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
      hint: 'desde a semana passada',
      accent: 'emerald' as const,
    },
    {
      label: 'Taxa de Conversão',
      value: `${s?.taxaConversao ?? 0}%`,
      hint: 'desde a semana passada',
      accent: 'cyan' as const,
    },
    {
      label: 'Tempo Médio de Resposta',
      value:
        s?.tempoMedioRespostaSeg != null
          ? `${s.tempoMedioRespostaSeg}s`
          : '—',
      hint: 'desde a semana passada',
      accent: 'violet' as const,
    },
    {
      label: 'Leads Gerados',
      value: s?.totalLeads ?? 0,
      hint: 'desde a semana passada',
      accent: 'amber' as const,
    },
  ]
})

const metrics = [
  { label: 'Taxa de Resposta', value: 47, color: 'emerald' as const },
  { label: 'Precisão das Respostas', value: 34, color: 'blue' as const },
  { label: 'Satisfação do Cliente', value: 92, color: 'emerald' as const },
  { label: 'Taxa de Conclusão', value: 41, color: 'blue' as const },
]
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
          <CardTitle class="text-xl">Atividades Recentes</CardTitle>
          <CardDescription>
            Visualize e gerencie as conversas mais recentes
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
              <p class="text-sm text-muted-foreground">Total de Mensagens</p>
              <p class="mt-1 text-2xl font-semibold">
                {{ stats?.mensagensEstaSemana ?? 0 }}
              </p>
              <p class="text-xs text-muted-foreground">esta semana</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Total de Mensagens</p>
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
