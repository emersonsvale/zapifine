<script setup lang="ts">
import { computed, ref } from 'vue'
import { List, Loader2, Zap, CreditCard, XCircle, Rocket } from 'lucide-vue-next'

useHead({ title: 'Minha Assinatura - Zapifine' })

const tab = ref<'visao' | 'faturamento' | 'uso'>('visao')

const {
  subscription,
  usoAtual,
  usoHistorico,
  faturas,
  proximaCobranca,
  openCustomerPortal,
  cancelSubscription,
  payTrialNow,
} = useSubscription()

const limite = computed(
  () => subscription.data.value?.plan?.limite_mensagens ?? 0,
)
const usados = computed(() => usoAtual.data.value?.total_mensagens ?? 0)
const extras = computed(
  () => usoAtual.data.value?.mensagens_excedentes ?? 0,
)

const isTrial = computed(() => !!subscription.data.value?.trial)
const cancelamentoAgendado = computed(
  () => !!subscription.data.value?.cancelado_em,
)
const semAssinatura = computed(
  () =>
    !subscription.pending.value &&
    (!subscription.data.value || subscription.data.value.ativo === false),
)

const { toast, confirm } = useAlerts()
const loading = ref<'portal' | 'cancel' | 'trial' | null>(null)

async function goPortal() {
  loading.value = 'portal'
  try {
    const url = await openCustomerPortal()
    window.location.href = url
  } catch (err) {
    toast.error(
      err instanceof Error ? err.message : 'Falha ao abrir portal.',
    )
  } finally {
    loading.value = null
  }
}

async function onCancel() {
  const ok = await confirm({
    title: 'Cancelar assinatura',
    description:
      'Você continuará com acesso até a data da próxima renovação. Deseja confirmar o cancelamento?',
    confirmLabel: 'Cancelar assinatura',
    variant: 'danger',
  })
  if (!ok) return
  loading.value = 'cancel'
  try {
    await cancelSubscription()
    toast.success('Assinatura será cancelada no fim do ciclo.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao cancelar.')
  } finally {
    loading.value = null
  }
}

async function onPayTrial() {
  const ok = await confirm({
    title: 'Encerrar trial',
    description:
      'Será emitida fatura imediata com o valor do plano. Deseja continuar?',
    confirmLabel: 'Pagar agora',
  })
  if (!ok) return
  loading.value = 'trial'
  try {
    await payTrialNow()
    toast.success('Trial encerrado. Cobrança emitida.')
  } catch (err) {
    toast.error(
      err instanceof Error ? err.message : 'Falha ao encerrar trial.',
    )
  } finally {
    loading.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">Minha Assinatura</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Gerencie seu plano e acompanhe o uso de mensagens
        </p>
      </div>

      <Button variant="outline" as-child>
        <NuxtLink to="/planos">
          <List class="h-4 w-4" />
          Ver todos os planos
        </NuxtLink>
      </Button>
    </div>

    <Card
      v-if="semAssinatura"
      class="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
    >
      <CardContent class="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Rocket class="h-5 w-5" />
          </div>
          <div>
            <p class="text-lg font-semibold">
              {{ subscription.data.value
                ? 'Assinatura inativa'
                : 'Você ainda não tem um plano' }}
            </p>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ subscription.data.value
                ? 'Reative sua assinatura para voltar a usar todos os recursos.'
                : 'Escolha um plano e comece a usar todos os recursos do Zapifine.' }}
            </p>
          </div>
        </div>
        <Button as-child>
          <NuxtLink to="/planos">Ver planos</NuxtLink>
        </Button>
      </CardContent>
    </Card>

    <div class="grid gap-4 lg:grid-cols-2">
      <SubscriptionCurrentPlanCard
        :subscription="subscription.data.value ?? null"
        :proxima-cobranca="proximaCobranca"
        :loading="subscription.pending.value"
      />
      <SubscriptionUsageCard
        :used="usados"
        :limit="limite"
        :extras="extras"
        :reset-at="proximaCobranca"
        :loading="usoAtual.pending.value || subscription.pending.value"
      />
    </div>

    <Tabs v-model="tab" class="gap-6">
      <TabsList class="h-11 p-1">
        <TabsTrigger value="visao" class="px-4">Visão Geral</TabsTrigger>
        <TabsTrigger value="faturamento" class="px-4">Faturamento</TabsTrigger>
        <TabsTrigger value="uso" class="px-4">Histórico de Uso</TabsTrigger>
      </TabsList>

      <TabsContent value="visao">
        <div class="grid gap-4 lg:grid-cols-2">
          <SubscriptionResourcesIncluded
            :plan="subscription.data.value?.plan ?? null"
          />

          <Card>
            <CardHeader>
              <CardTitle class="text-2xl">Ações Rápidas</CardTitle>
              <CardDescription>Gerencie sua assinatura</CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <p
                v-if="semAssinatura"
                class="rounded-md border border-muted-foreground/20 bg-muted/20 px-3 py-2 text-sm text-muted-foreground"
              >
                Nenhuma assinatura ativa. Escolha um plano para liberar estas
                ações.
              </p>

              <Button
                v-if="isTrial"
                variant="default"
                class="w-full justify-center"
                :disabled="loading !== null"
                @click="onPayTrial"
              >
                <Loader2 v-if="loading === 'trial'" class="h-4 w-4 animate-spin" />
                <Zap v-else class="h-4 w-4" />
                Pagar agora (encerrar trial)
              </Button>

              <Button
                variant="outline"
                class="w-full justify-center"
                :disabled="loading !== null || cancelamentoAgendado || semAssinatura"
                @click="onCancel"
              >
                <Loader2 v-if="loading === 'cancel'" class="h-4 w-4 animate-spin" />
                <XCircle v-else class="h-4 w-4" />
                {{ cancelamentoAgendado ? 'Cancelamento agendado' : 'Cancelar Assinatura' }}
              </Button>

              <Button
                variant="outline"
                class="w-full justify-center"
                :disabled="loading !== null || semAssinatura"
                @click="goPortal"
              >
                <Loader2 v-if="loading === 'portal'" class="h-4 w-4 animate-spin" />
                <CreditCard v-else class="h-4 w-4" />
                Atualizar Forma de Pagamento
              </Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="faturamento">
        <SubscriptionBillingTab
          :faturas="faturas.data.value ?? []"
          :loading="faturas.pending.value"
        />
      </TabsContent>

      <TabsContent value="uso">
        <SubscriptionUsageHistoryTab
          :historico="usoHistorico.data.value ?? []"
          :limite="limite"
          :loading="usoHistorico.pending.value"
        />
      </TabsContent>
    </Tabs>
  </div>
</template>
