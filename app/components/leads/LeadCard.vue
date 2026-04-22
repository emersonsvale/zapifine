<script setup lang="ts">
import { computed } from 'vue'
import {
  MessageCircle,
  Bot,
  Hand,
  CalendarDays,
} from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Lead = Database['public']['Tables']['leads']['Row']

const props = defineProps<{ lead: Lead }>()
const emit = defineEmits<{
  toggleIa: [id: number]
  openWhatsapp: [lead: Lead]
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
  weekday: 'long',
  day: '2-digit',
  month: 'long',
})

const displayDate = computed(() => {
  const iso = props.lead.ultima_interacao_lead ?? props.lead.created_at
  return iso ? dateFmt.format(new Date(iso)) : ''
})

const hasIa = computed(() => props.lead.ia_ativa === true)
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
    </div>

    <p
      v-if="lead.numero_whatsapp_lead"
      class="mt-2 truncate font-mono text-xs text-muted-foreground"
    >
      {{ lead.numero_whatsapp_lead }}
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
        @click.stop="emit('openWhatsapp', lead)"
      >
        <MessageCircle class="h-3 w-3" />
      </button>
    </div>
  </div>
</template>
