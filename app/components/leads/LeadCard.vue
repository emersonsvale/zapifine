<script setup lang="ts">
import { computed } from 'vue'
import {
  MessageCircle,
  Bot,
  Hand,
  CalendarDays,
  DollarSign,
} from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Lead = Database['public']['Tables']['leads']['Row']

const props = withDefaults(
  defineProps<{
    lead: Lead
    unread?: number
  }>(),
  { unread: 0 },
)

const emit = defineEmits<{
  toggleIa: [id: number]
  openConversation: [lead: Lead]
  click: [lead: Lead]
}>()

const fallbackLabel = computed(() => {
  const n = props.lead.nome_lead?.trim()
  if (n) return n
  return `#${props.lead.id}`
})

const initial = computed(() => {
  const n = props.lead.nome_lead?.trim()
  if (!n) return '#'
  return n[0]!.toUpperCase()
})

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
})

const displayDate = computed(() => {
  const iso = props.lead.ultima_interacao_lead ?? props.lead.created_at
  return iso ? dateFmt.format(new Date(iso)) : ''
})

const hasIa = computed(() => props.lead.ia_ativa === true)

const currencyFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

const valorFmt = computed(() => {
  const v = props.lead.valor_negocio
  if (v == null || Number(v) <= 0) return ''
  return currencyFmt.format(Number(v))
})

const tags = computed<string[]>(() => {
  const t = props.lead.tags
  if (!Array.isArray(t)) return []
  return t.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
})

const resumo = computed(() => {
  const r = props.lead.resumo_lead?.trim()
  if (r) return r
  const obs = props.lead.observacao?.trim()
  return obs ?? ''
})
</script>

<template>
  <div
    class="cursor-grab rounded-md border bg-card p-3 shadow-sm transition-colors hover:border-primary/50"
    @click="emit('click', lead)"
  >
    <div class="flex items-start gap-2">
      <div
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium"
      >
        {{ initial }}
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold">{{ fallbackLabel }}</p>
        <p
          v-if="displayDate"
          class="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"
        >
          <CalendarDays class="h-3 w-3" />
          {{ displayDate }}
        </p>
      </div>
      <div
        v-if="unread > 0"
        class="shrink-0 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white"
        :title="`${unread} mensagem(ns) não lida(s)`"
      >
        {{ unread > 99 ? '99+' : unread }}
      </div>
    </div>

    <div v-if="tags.length" class="mt-2 flex flex-wrap gap-1">
      <span
        v-for="t in tags.slice(0, 4)"
        :key="t"
        class="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
      >
        {{ t }}
      </span>
      <span
        v-if="tags.length > 4"
        class="text-[10px] text-muted-foreground"
      >
        +{{ tags.length - 4 }}
      </span>
    </div>

    <p
      v-if="resumo"
      class="mt-2 line-clamp-2 text-[11px] text-muted-foreground"
    >
      {{ resumo }}
    </p>

    <div class="mt-2 flex items-center gap-1.5">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors"
        :class="
          hasIa
            ? 'bg-primary/15 text-primary hover:bg-primary/25'
            : 'bg-muted text-muted-foreground hover:bg-muted/60'
        "
        :title="hasIa ? 'IA respondendo. Click para pausar' : 'Manual. Click para ativar IA'"
        @click.stop="emit('toggleIa', lead.id)"
      >
        <Bot v-if="hasIa" class="h-3 w-3" />
        <Hand v-else class="h-3 w-3" />
        {{ hasIa ? 'IA' : 'Manual' }}
      </button>

      <button
        v-if="lead.numero_whatsapp_lead"
        type="button"
        class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 transition-colors hover:bg-emerald-500/25"
        title="Abrir conversa"
        @click.stop="emit('openConversation', lead)"
      >
        <MessageCircle class="h-3 w-3" />
      </button>

      <span
        v-if="valorFmt"
        class="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500"
        :title="'Valor negociado'"
      >
        <DollarSign class="h-3 w-3" />
        {{ valorFmt }}
      </span>
    </div>
  </div>
</template>
