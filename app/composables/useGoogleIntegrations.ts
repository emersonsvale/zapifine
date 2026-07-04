export type GoogleCalendarItem = {
  id: string
  integration_id: string
  gg_calendar_id: string
  summary: string | null
  description: string | null
  time_zone: string | null
  primary_flag: boolean
  access_role: string | null
  selected: boolean
  default_write: boolean
  color_hex: string | null
  synced_at: string | null
}

export type GoogleIntegrationItem = {
  id: string
  user_id: string
  companie_id: string
  gg_email: string | null
  scopes: string[] | null
  created_at: string
  updated_at: string
  is_mine: boolean
  calendars: GoogleCalendarItem[]
}

type Scope = 'me' | 'company'

function asMessage(err: unknown): string {
  const e = err as {
    statusMessage?: string
    data?: { statusMessage?: string; message?: string }
    message?: string
  }
  return (
    e?.data?.statusMessage
    ?? e?.statusMessage
    ?? e?.data?.message
    ?? e?.message
    ?? 'Erro desconhecido'
  )
}

export function useGoogleIntegrations(scope: Ref<Scope> | ComputedRef<Scope>) {
  const { data, refresh, pending } = useAsyncData<GoogleIntegrationItem[]>(
    () => `google-integrations-${scope.value}`,
    async () => {
      const res = await $fetch<{ integrations: GoogleIntegrationItem[] }>(
        '/api/google/integrations',
        { query: { scope: scope.value } },
      )
      return res.integrations
    },
    { watch: [scope], default: () => [] },
  )

  async function patchCalendar(
    calendarId: string,
    patch: { selected?: boolean; default_write?: boolean },
  ) {
    try {
      await $fetch(`/api/google/calendars/${calendarId}`, {
        method: 'PATCH',
        body: patch,
      })
      await refresh()
    } catch (err) {
      throw new Error(asMessage(err))
    }
  }

  async function disconnect(integrationId: string) {
    try {
      await $fetch('/api/google/oauth/disconnect', {
        method: 'POST',
        body: { integration_id: integrationId },
      })
      await refresh()
    } catch (err) {
      throw new Error(asMessage(err))
    }
  }

  async function syncNow(integrationId: string) {
    try {
      return await $fetch<{ ok: boolean; upserted: number; cancelled: number }>(
        '/api/google/sync',
        { method: 'POST', body: { integration_id: integrationId } },
      )
    } catch (err) {
      throw new Error(asMessage(err))
    }
  }

  return { integrations: data, refresh, pending, patchCalendar, disconnect, syncNow }
}
