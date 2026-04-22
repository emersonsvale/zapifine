<script setup lang="ts">
import { ref } from 'vue'
import { Calendar as CalIcon, List as ListIcon, Plus } from 'lucide-vue-next'

useHead({ title: 'Agendas e Disponibilidade - Zapifine' })

const view = ref<'calendario' | 'lista'>('calendario')
const dialogOpen = ref(false)

const {
  agendamentos,
  pending,
  isGoogleConnected,
  googleConnectUrl,
  confirmEvent,
  cancelEvent,
} = useAgendamentos()

const { toast, confirm } = useAlerts()

function connectGoogle() {
  if (!googleConnectUrl.value) return
  window.location.href = googleConnectUrl.value
}

async function onConfirm(agendamentoId: string) {
  try {
    await confirmEvent(agendamentoId)
    toast.success('Agendamento confirmado.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao confirmar.')
  }
}

async function onCancel(agendamentoId: string) {
  const ok = await confirm({
    title: 'Cancelar agendamento',
    description:
      'O evento será removido do Google Calendar. Esta ação não pode ser desfeita.',
    confirmLabel: 'Cancelar agendamento',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await cancelEvent(agendamentoId)
    toast.success('Agendamento cancelado.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao cancelar.')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <h1 class="text-3xl font-semibold tracking-tight">
        Agendas e Disponibilidade
      </h1>

      <div class="flex items-center gap-2">
        <Button v-if="isGoogleConnected" @click="dialogOpen = true">
          <Plus class="h-4 w-4" />
          Novo Agendamento
        </Button>

        <Button
          v-else
          variant="outline"
          @click="connectGoogle"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M21.35 11.1h-9.17v2.9h5.26c-.24 1.42-1.73 4.17-5.26 4.17-3.16 0-5.74-2.62-5.74-5.84s2.58-5.84 5.74-5.84c1.8 0 3.01.77 3.7 1.43l2.52-2.43C16.77 3.96 14.78 3 12.18 3 7.3 3 3.36 6.93 3.36 11.83s3.94 8.83 8.82 8.83c5.09 0 8.46-3.58 8.46-8.62 0-.58-.06-1.02-.29-1.94z"
            />
          </svg>
          Conectar Google Calendar
        </Button>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Tabs v-model="view" class="gap-4">
        <TabsList class="h-10 p-1">
          <TabsTrigger value="calendario" class="px-4">
            <CalIcon class="h-4 w-4" />
            Calendário
          </TabsTrigger>
          <TabsTrigger value="lista" class="px-4">
            <ListIcon class="h-4 w-4" />
            Lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendario">
          <AgendasCalendarView :agendamentos="agendamentos ?? []" />
        </TabsContent>
        <TabsContent value="lista">
          <AgendasListView
            :agendamentos="agendamentos ?? []"
            :loading="pending"
            @confirm="onConfirm($event.id)"
            @cancel="onCancel($event.id)"
          />
        </TabsContent>
      </Tabs>

      <AgendasNotificationsPanel
        :agendamentos="agendamentos ?? []"
        @confirm="onConfirm($event.id)"
        @cancel="onCancel($event.id)"
      />
    </div>

    <AgendasNovoAgendamentoDialog v-model:open="dialogOpen" />
  </div>
</template>
