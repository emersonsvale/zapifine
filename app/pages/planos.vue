<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Plan = Database['public']['Tables']['plan']['Row']

useHead({ title: 'Selecione seu plano - Zapifine' })

const { subscription, planos, checkout, changePlan } = useSubscription()
const { toast, confirm } = useAlerts()

const pendingId = ref<number | null>(null)

const currentPlanId = computed(
  () => subscription.data.value?.plan_id ?? null,
)

const hasActiveSubscription = computed(
  () => !!subscription.data.value?.stripe_subscription_id,
)

const highlightId = computed(() => {
  const list = planos.data.value ?? []
  if (!list.length) return null
  const sorted = [...list].sort(
    (a, b) => (a.valor_mensal ?? 0) - (b.valor_mensal ?? 0),
  )
  return sorted[Math.floor(sorted.length / 2)]?.id ?? null
})

async function selectPlan(plan: Plan) {
  pendingId.value = plan.id
  try {
    if (hasActiveSubscription.value) {
      const ok = await confirm({
        title: `Trocar para ${plan.nome}`,
        description:
          'A diferença será cobrada proporcionalmente agora. Deseja continuar?',
        confirmLabel: 'Trocar plano',
      })
      if (!ok) {
        pendingId.value = null
        return
      }
      await changePlan(plan.id)
      toast.success('Plano alterado.')
      await navigateTo('/assinatura')
    } else {
      const url = await checkout(plan.id)
      window.location.href = url
    }
  } catch (err) {
    toast.error(
      err instanceof Error
        ? err.message
        : 'Falha ao processar seleção de plano.',
    )
  } finally {
    pendingId.value = null
  }
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" as-child>
        <NuxtLink to="/assinatura">
          <ArrowLeft class="h-4 w-4" />
          Voltar
        </NuxtLink>
      </Button>
    </div>

    <div class="text-center">
      <h1 class="text-4xl font-semibold tracking-tight">
        Selecione seu novo plano
      </h1>
      <p class="mt-2 text-sm text-muted-foreground">
        Escolha o plano que melhor se adapta às suas necessidades
      </p>
    </div>

    <div
      v-if="planos.pending.value"
      class="text-center text-sm text-muted-foreground"
    >
      Carregando planos...
    </div>

    <div
      v-if="planos.data.value?.length"
      class="mx-auto grid max-w-6xl gap-6 md:grid-cols-3"
    >
      <SubscriptionPlanCard
        v-for="p in planos.data.value"
        :key="p.id"
        :plan="p"
        :is-current="currentPlanId === p.id"
        :highlight="highlightId === p.id"
        :loading="pendingId === p.id"
        @select="selectPlan"
      />
    </div>
  </div>
</template>
