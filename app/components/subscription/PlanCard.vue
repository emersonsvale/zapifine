<script setup lang="ts">
import { Check, Loader2 } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Plan = Database['public']['Tables']['plan']['Row']

const props = defineProps<{
  plan: Plan
  isCurrent: boolean
  highlight?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', plan: Plan): void
}>()

const moneyFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const preco = computed(() =>
  props.plan.valor_mensal != null
    ? moneyFmt.format(Number(props.plan.valor_mensal))
    : '—',
)
</script>

<template>
  <div
    class="relative flex flex-col rounded-xl border bg-card p-6 transition"
    :class="[
      highlight ? 'border-emerald-500 shadow-lg' : 'border-border',
      isCurrent ? 'opacity-70' : '',
    ]"
  >
    <span
      v-if="highlight"
      class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-emerald-950"
    >
      Mais popular
    </span>

    <h3 class="text-lg font-semibold">{{ plan.nome }}</h3>

    <p class="mt-3 text-4xl font-bold">
      {{ preco }}<span class="text-lg font-normal text-muted-foreground">/mês</span>
    </p>

    <ul class="mt-6 flex-1 space-y-2 text-sm">
      <li v-if="plan.limite_users" class="flex items-start gap-2">
        <Check class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <span>Até {{ plan.limite_users }} usuário{{ plan.limite_users > 1 ? 's' : '' }}</span>
      </li>
      <li
        v-for="(r, i) in plan.recursos ?? []"
        :key="i"
        class="flex items-start gap-2"
      >
        <Check class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <span>{{ r }}</span>
      </li>
      <li v-if="plan.limite_mensagens" class="flex items-start gap-2">
        <Check class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <span>
          {{ plan.limite_mensagens.toLocaleString('pt-BR') }} mensagens
        </span>
      </li>
      <li v-if="plan.limite_leads" class="flex items-start gap-2">
        <Check class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <span>
          {{ plan.limite_leads.toLocaleString('pt-BR') }} leads
        </span>
      </li>
    </ul>

    <p
      v-if="plan.extras_beneficios"
      class="mt-4 text-xs italic text-muted-foreground"
    >
      {{ plan.extras_beneficios }}
    </p>

    <Button
      class="mt-6 w-full"
      :disabled="isCurrent || loading"
      @click="emit('select', plan)"
    >
      <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
      {{ isCurrent ? 'Plano Atual' : 'Selecione Plano' }}
    </Button>
  </div>
</template>
