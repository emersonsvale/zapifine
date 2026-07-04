<script setup lang="ts">
import { computed, ref } from 'vue'
import { RefreshCw, Star, Unplug, Loader2, CalendarClock, Eye, EyeOff, Plus } from 'lucide-vue-next'
import {
  useGoogleIntegrations,
  type GoogleCalendarItem,
  type GoogleIntegrationItem,
} from '~/composables/useGoogleIntegrations'

const open = defineModel<boolean>('open', { default: false })

const { data: current } = useCurrentUser()
const isOwner = computed(() => current.value?.funcao_user === 'OWNER')

const scope = ref<'me' | 'company'>('me')
const { integrations, refresh, pending, patchCalendar, disconnect, syncNow } =
  useGoogleIntegrations(scope)

const { toast, confirm } = useAlerts()
const busy = ref<Record<string, boolean>>({})

async function toggleSelected(cal: GoogleCalendarItem) {
  busy.value[cal.id] = true
  try {
    await patchCalendar(cal.id, { selected: !cal.selected })
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao atualizar.')
  } finally {
    busy.value[cal.id] = false
  }
}

async function setDefaultWrite(cal: GoogleCalendarItem) {
  if (cal.access_role === 'reader' || cal.access_role === 'freeBusyReader') return
  busy.value[cal.id] = true
  try {
    await patchCalendar(cal.id, { default_write: true })
    toast.success(`"${cal.summary ?? cal.gg_calendar_id}" definido como padrão.`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao definir padrão.')
  } finally {
    busy.value[cal.id] = false
  }
}

async function onDisconnect(integ: GoogleIntegrationItem) {
  const ok = await confirm({
    title: `Desconectar ${integ.gg_email ?? 'conta Google'}`,
    description:
      'Novos agendamentos deixarão de sincronizar. Eventos já criados no Google permanecem lá.',
    confirmLabel: 'Desconectar',
    variant: 'danger',
  })
  if (!ok) return
  busy.value[integ.id] = true
  try {
    await disconnect(integ.id)
    toast.success('Conta desconectada.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao desconectar.')
  } finally {
    busy.value[integ.id] = false
  }
}

async function onSync(integ: GoogleIntegrationItem) {
  busy.value[integ.id] = true
  try {
    const res = await syncNow(integ.id)
    toast.success(`Sync ok. ${res.upserted} importados, ${res.cancelled} cancelados.`)
    await refresh()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao sincronizar.')
  } finally {
    busy.value[integ.id] = false
  }
}

function addAccount() {
  window.location.href = '/api/google/oauth/start'
}

function accessRoleLabel(r: string | null) {
  if (r === 'owner') return 'Proprietário'
  if (r === 'writer') return 'Escrita'
  if (r === 'reader') return 'Leitura'
  if (r === 'freeBusyReader') return 'Free/Busy'
  return r ?? '—'
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent side="right" class="w-full sm:max-w-lg overflow-y-auto">
      <SheetHeader>
        <SheetTitle class="flex items-center gap-2">
          <CalendarClock class="h-5 w-5" />
          Calendários Google
        </SheetTitle>
        <SheetDescription>
          Gerencia integrações e escolhe quais calendários sincronizar.
        </SheetDescription>
      </SheetHeader>

      <div v-if="isOwner" class="mt-4 flex items-center gap-2">
        <Button
          size="sm"
          :variant="scope === 'me' ? 'default' : 'outline'"
          @click="scope = 'me'"
        >
          Minhas
        </Button>
        <Button
          size="sm"
          :variant="scope === 'company' ? 'default' : 'outline'"
          @click="scope = 'company'"
        >
          Empresa
        </Button>
      </div>

      <div v-if="pending" class="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 class="h-4 w-4 animate-spin" />
        Carregando...
      </div>

      <div
        v-else-if="!integrations?.length"
        class="mt-6 flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center"
      >
        <p class="text-sm text-muted-foreground">
          Nenhuma conta Google conectada.
        </p>
        <Button size="sm" @click="addAccount">
          <Plus class="h-4 w-4" />
          Conectar Google
        </Button>
      </div>

      <div v-else class="mt-4 space-y-5">
        <div
          v-for="integ in integrations"
          :key="integ.id"
          class="rounded-lg border p-4"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate font-medium">
                {{ integ.gg_email ?? 'Conta Google' }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ integ.calendars.length }} calendário(s)
              </p>
            </div>
            <div class="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                title="Sincronizar agora"
                :disabled="!!busy[integ.id]"
                @click="onSync(integ)"
              >
                <RefreshCw class="h-4 w-4" :class="busy[integ.id] ? 'animate-spin' : ''" />
              </Button>
              <Button
                v-if="integ.is_mine || isOwner"
                variant="ghost"
                size="icon"
                title="Desconectar"
                :disabled="!!busy[integ.id]"
                @click="onDisconnect(integ)"
              >
                <Unplug class="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          <div class="mt-3 space-y-1.5">
            <div
              v-for="cal in integ.calendars"
              :key="cal.id"
              class="flex items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 hover:bg-muted/40"
            >
              <div class="flex min-w-0 items-center gap-2">
                <span
                  class="h-2.5 w-2.5 shrink-0 rounded-full"
                  :style="cal.color_hex ? `background:${cal.color_hex}` : ''"
                  :class="!cal.color_hex ? 'bg-muted-foreground' : ''"
                />
                <span class="truncate text-sm" :title="cal.gg_calendar_id">
                  {{ cal.summary ?? cal.gg_calendar_id }}
                  <span v-if="cal.primary_flag" class="text-xs text-amber-400">•</span>
                </span>
                <span class="hidden shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground sm:inline">
                  {{ accessRoleLabel(cal.access_role) }}
                </span>
              </div>
              <div class="flex shrink-0 items-center gap-1">
                <Button
                  v-if="cal.access_role === 'owner' || cal.access_role === 'writer'"
                  variant="ghost"
                  size="icon"
                  :title="cal.default_write ? 'Padrão de escrita' : 'Definir como padrão'"
                  :disabled="!!busy[cal.id]"
                  @click="setDefaultWrite(cal)"
                >
                  <Star
                    class="h-4 w-4"
                    :class="cal.default_write ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'"
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  :title="cal.selected ? 'Sincronizando (clique pra desativar)' : 'Não sincronizado'"
                  :disabled="!!busy[cal.id]"
                  @click="toggleSelected(cal)"
                >
                  <Eye v-if="cal.selected" class="h-4 w-4 text-emerald-400" />
                  <EyeOff v-else class="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" class="w-full" @click="addAccount">
          <Plus class="h-4 w-4" />
          Adicionar outra conta Google
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
