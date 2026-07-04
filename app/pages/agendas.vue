<script setup lang="ts">
import { computed, ref } from 'vue'
import { Calendar as CalIcon, List as ListIcon, Plus, RefreshCw, Clock, MessageSquare, Bug, Globe, Settings2 } from 'lucide-vue-next'
import type { AgendamentoWithLead } from '~/composables/useAgendamentos'
import type { Database } from '~~/types/database'

useHead({ title: 'Agendas e Disponibilidade - Zapifine' })

type View = 'calendario' | 'lista' | 'disponibilidade' | 'templates' | 'publico' | 'debug'
const view = ref<View>('calendario')

const { data: current } = useCurrentUser()
const isOwner = computed(() => current.value?.funcao_user === 'OWNER')

const supabase = useSupabaseClient<Database>()
const filterUserId = ref<string>('all')

const { data: companyUsers } = useAsyncData(
  'agendas-company-users',
  async () => {
    if (!isOwner.value || !current.value?.companie_id) return []
    const { data } = await supabase
      .from('users')
      .select('id, nome, email')
      .eq('companie_id', current.value.companie_id)
      .neq('status', 'Desativado')
      .order('nome', { ascending: true })
    return data ?? []
  },
  { watch: [isOwner, () => current.value?.companie_id], default: () => [] },
)
const dialogOpen = ref(false)
const editDialogOpen = ref(false)
const editing = ref<AgendamentoWithLead | null>(null)
const detailsOpen = ref(false)
const viewing = ref<AgendamentoWithLead | null>(null)
const syncing = ref(false)
const calendariosSheetOpen = ref(false)
const monthCursor = ref(new Date())
const prefillDate = ref<string | null>(null)

const {
  agendamentos,
  pending,
  isGoogleConnected,
  googleConnectUrl,
  confirmEvent,
  cancelEvent,
  syncFromGoogle,
} = useAgendamentos()

const filteredAgendamentos = computed<AgendamentoWithLead[]>(() => {
  const list = agendamentos.value ?? []
  if (!isOwner.value) return list
  if (filterUserId.value === 'all') return list
  return list.filter((a) => a.user_id === filterUserId.value)
})

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
      'O evento será removido do Google Calendar e os convidados serão notificados.',
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

function onEdit(ag: AgendamentoWithLead) {
  if (ag.status_agenda === 'Cancelado') {
    toast.error('Não é possível editar um agendamento cancelado.')
    return
  }
  editing.value = ag
  editDialogOpen.value = true
}

function onSelect(ag: AgendamentoWithLead) {
  viewing.value = ag
  detailsOpen.value = true
}

function onNewFromDay(ymd: string) {
  prefillDate.value = ymd
  dialogOpen.value = true
}

async function onSync() {
  syncing.value = true
  try {
    const res = await syncFromGoogle()
    toast.success(
      `Sync ok. ${res.upserted} importados, ${res.cancelled} cancelados${res.full_resync ? ' (full resync)' : ''}.`,
    )
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha na sincronização.')
  } finally {
    syncing.value = false
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
        <template v-if="isGoogleConnected">
          <Button variant="outline" :disabled="syncing" @click="onSync">
            <RefreshCw class="h-4 w-4" :class="syncing ? 'animate-spin' : ''" />
            Sincronizar
          </Button>
          <Button variant="outline" @click="calendariosSheetOpen = true">
            <Settings2 class="h-4 w-4" />
            Calendários
          </Button>
          <Button @click="prefillDate = null; dialogOpen = true">
            <Plus class="h-4 w-4" />
            Novo Agendamento
          </Button>
        </template>

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

    <div
      :class="['calendario', 'lista'].includes(view)
        ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]'
        : 'space-y-0'"
    >
      <Tabs v-model="view" class="gap-4">
        <div v-if="isOwner && ['calendario', 'lista'].includes(view)" class="flex items-center gap-2">
          <Select v-model="filterUserId">
            <SelectTrigger class="h-9 w-[220px]">
              <SelectValue placeholder="Todos os atendentes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os atendentes</SelectItem>
              <SelectItem
                v-for="u in companyUsers ?? []"
                :key="u.id"
                :value="u.id"
              >
                {{ u.nome ?? u.email ?? u.id.slice(0, 8) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsList class="h-10 p-1 flex-wrap">
          <TabsTrigger value="calendario" class="px-4">
            <CalIcon class="h-4 w-4" />
            Calendário
          </TabsTrigger>
          <TabsTrigger value="lista" class="px-4">
            <ListIcon class="h-4 w-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="disponibilidade" class="px-4">
            <Clock class="h-4 w-4" />
            Disponibilidade
          </TabsTrigger>
          <TabsTrigger v-if="isOwner" value="templates" class="px-4">
            <MessageSquare class="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger v-if="isOwner" value="publico" class="px-4">
            <Globe class="h-4 w-4" />
            Página pública
          </TabsTrigger>
          <TabsTrigger v-if="isOwner" value="debug" class="px-4">
            <Bug class="h-4 w-4" />
            Lembretes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendario">
          <AgendasCalendarView
            v-model:cursor="monthCursor"
            :agendamentos="filteredAgendamentos"
            @select="onSelect"
            @day="onNewFromDay"
          />
        </TabsContent>
        <TabsContent value="lista">
          <AgendasListView
            v-model:cursor="monthCursor"
            :agendamentos="filteredAgendamentos"
            :loading="pending"
            @edit="onEdit"
            @confirm="onConfirm($event.id)"
            @cancel="onCancel($event.id)"
          />
        </TabsContent>
        <TabsContent value="disponibilidade">
          <AgendasDisponibilidadeTab />
        </TabsContent>
        <TabsContent v-if="isOwner" value="templates">
          <AgendasTemplatesTab />
        </TabsContent>
        <TabsContent v-if="isOwner" value="publico">
          <AgendasPublicoTab />
        </TabsContent>
        <TabsContent v-if="isOwner" value="debug">
          <AgendasLembretesDebugTab />
        </TabsContent>
      </Tabs>

      <AgendasNotificationsPanel
        v-if="['calendario', 'lista'].includes(view)"
        :agendamentos="filteredAgendamentos"
        @confirm="onConfirm($event.id)"
        @cancel="onCancel($event.id)"
      />
    </div>

    <AgendasNovoAgendamentoDialog
      v-model:open="dialogOpen"
      :prefill-date="prefillDate"
    />
    <AgendasEditarAgendamentoDialog
      v-model:open="editDialogOpen"
      :agendamento="editing"
    />
    <AgendasDetalhesAgendamentoDialog
      v-model:open="detailsOpen"
      :agendamento="viewing"
      @edit="onEdit"
      @confirm="onConfirm($event.id)"
      @cancel="onCancel($event.id)"
    />
    <AgendasGoogleCalendariosSheet v-model:open="calendariosSheetOpen" />
  </div>
</template>
