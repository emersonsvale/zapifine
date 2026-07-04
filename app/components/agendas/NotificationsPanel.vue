<script setup lang="ts">
import { computed, ref } from 'vue'
import { Bell, Calendar, Loader2 } from 'lucide-vue-next'
import type { AgendamentoWithLead } from '~/composables/useAgendamentos'

const props = defineProps<{
  agendamentos: AgendamentoWithLead[]
}>()

const emit = defineEmits<{
  (e: 'confirm', ag: AgendamentoWithLead): void
  (e: 'cancel', ag: AgendamentoWithLead): void
}>()

const busy = ref<Record<string, 'confirm' | 'cancel' | null>>({})

const pendentes = computed(() =>
  props.agendamentos
    .filter((a) => !a.is_external && (a.status_agenda ?? 'Pendente') === 'Pendente')
    .slice(0, 20),
)

function fmtDateTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function onConfirm(ag: AgendamentoWithLead) {
  busy.value[ag.id] = 'confirm'
  try {
    emit('confirm', ag)
  } finally {
    busy.value[ag.id] = null
  }
}

async function onCancel(ag: AgendamentoWithLead) {
  busy.value[ag.id] = 'cancel'
  try {
    emit('cancel', ag)
  } finally {
    busy.value[ag.id] = null
  }
}
</script>

<template>
  <Card class="h-fit">
    <CardHeader class="pb-3">
      <CardTitle class="flex items-center gap-2 text-base">
        <Bell class="h-4 w-4" />
        Notificações
      </CardTitle>
    </CardHeader>

    <CardContent class="space-y-3">
      <div
        v-if="!pendentes.length"
        class="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground"
      >
        <div
          class="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40"
        >
          <ZapifineLogo :size="28" />
        </div>
        Não há nada por aqui
      </div>

      <div
        v-for="ag in pendentes"
        :key="ag.id"
        class="rounded-lg border bg-card/50 p-3"
      >
        <div class="flex items-start gap-2">
          <Calendar class="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold">
              {{ ag.gg_title ?? 'Agendamento' }}
            </p>
            <p class="mt-0.5 text-xs leading-snug text-muted-foreground">
              {{ fmtDateTime(ag.gg_start) }}
              <span v-if="ag.lead?.nome_lead">
                · {{ ag.lead.nome_lead }}
              </span>
            </p>
            <p class="mt-0.5 text-xs leading-snug text-muted-foreground">
              Você tem um agendamento, confirme e notifique seu lead!
            </p>
          </div>
        </div>

        <div class="mt-3 space-y-2">
          <Button
            size="sm"
            class="w-full"
            :disabled="busy[ag.id] !== undefined && busy[ag.id] !== null"
            @click="onConfirm(ag)"
          >
            <Loader2
              v-if="busy[ag.id] === 'confirm'"
              class="h-4 w-4 animate-spin"
            />
            Confirmar
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="w-full"
            :disabled="busy[ag.id] !== undefined && busy[ag.id] !== null"
            @click="onCancel(ag)"
          >
            <Loader2
              v-if="busy[ag.id] === 'cancel'"
              class="h-4 w-4 animate-spin"
            />
            Cancelar
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
