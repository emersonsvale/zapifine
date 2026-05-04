import type { Database } from '~~/types/database'

type ParticipantRow = {
  jid: string
  nome: string | null
  avatar_url: string | null
}

export function useParticipants() {
  const supabase = useSupabaseClient<Database>()
  const authUser = useSupabaseUser()

  const map = useState<Record<string, ParticipantRow>>(
    'whats-participantes-map',
    () => ({}),
  )
  const companyId = useState<string | null>('whats-participantes-company', () => null)
  const initialized = useState<boolean>('whats-participantes-initialized', () => false)
  let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

  async function loadCompanyId(userId: string | null | undefined): Promise<string | null> {
    if (!userId) return null
    const { data } = await supabase
      .from('users')
      .select('companie_id')
      .eq('id', userId)
      .maybeSingle()
    return data?.companie_id ?? null
  }

  async function fetchAll(cid: string) {
    const { data, error } = await supabase
      .from('whats_participantes')
      .select('jid, nome, avatar_url')
      .eq('companies_id', cid)
    if (error) {
      console.warn('[useParticipants] select error', error.message)
      return
    }
    const next: Record<string, ParticipantRow> = {}
    for (const r of (data ?? []) as ParticipantRow[]) {
      next[r.jid] = r
    }
    map.value = next
  }

  function applyRow(row: ParticipantRow) {
    map.value = { ...map.value, [row.jid]: row }
  }

  async function subscribe(cid: string) {
    if (realtimeChannel) {
      await supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
    realtimeChannel = supabase
      .channel(`whats-participantes-${cid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whats_participantes',
          filter: `companies_id=eq.${cid}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as ParticipantRow | null
          if (!row?.jid) return
          if (payload.eventType === 'DELETE') {
            const next = { ...map.value }
            delete next[row.jid]
            map.value = next
          } else {
            applyRow(row)
          }
        },
      )
      .subscribe()
  }

  async function init() {
    const cid = await loadCompanyId(authUser.value?.id)
    if (!cid) return
    if (companyId.value === cid) return
    companyId.value = cid
    await fetchAll(cid)
    if (import.meta.client) await subscribe(cid)
  }

  function jidToDigits(jid: string): string {
    const before = jid.split('@')[0] ?? jid
    return before.replace(/\D/g, '') || before
  }

  function nameFor(jid: string | null | undefined): string {
    if (!jid) return ''
    const row = map.value[jid]
    if (row?.nome?.trim()) return row.nome.trim()
    return jidToDigits(jid)
  }

  function avatarFor(jid: string | null | undefined): string | null {
    if (!jid) return null
    return map.value[jid]?.avatar_url ?? null
  }

  if (import.meta.client && !initialized.value) {
    initialized.value = true
    watch(() => authUser.value?.id, () => void init(), { immediate: true })
  }

  return {
    init,
    nameFor,
    avatarFor,
    map,
  }
}
