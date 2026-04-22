import type { Database } from '~~/types/database'

type Bot = Database['public']['Tables']['bots']['Row']
type BotUpdate = Database['public']['Tables']['bots']['Update']
type BotInsert = Database['public']['Tables']['bots']['Insert']

async function loadCompanyId(
  supabase: ReturnType<typeof useSupabaseClient<Database>>,
  userId: string | null | undefined,
): Promise<string | null> {
  if (!userId) return null
  const { data, error } = await supabase
    .from('users')
    .select('companie_id')
    .eq('id', userId)
    .maybeSingle()
  if (error) return null
  return data?.companie_id ?? null
}

export function useBot() {
  const supabase = useSupabaseClient<Database>()
  const authUser = useSupabaseUser()
  const { data: currentUser } = useCurrentUser()

  const canEdit = computed(
    () => currentUser.value?.funcao_user === 'OWNER',
  )

  const {
    data: bot,
    refresh,
    pending,
  } = useAsyncData<Bot | null>(
    'bot-config',
    async () => {
      const cid = await loadCompanyId(supabase, authUser.value?.id)
      if (!cid) return null
      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .eq('company_id', cid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data ?? null
    },
    { watch: [() => authUser.value?.id] },
  )

  async function updateBot(patch: BotUpdate) {
    if (bot.value?.id) {
      const { data, error } = await supabase
        .from('bots')
        .update(patch)
        .eq('id', bot.value.id)
        .select('*')
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('UPDATE bloqueado pelo RLS (requer OWNER).')
      bot.value = data
      return
    }
    // Bot inexistente → cria na empresa atual
    const cid = await loadCompanyId(supabase, authUser.value?.id)
    if (!cid) throw new Error('Empresa não associada.')
    const insert: BotInsert = {
      ...patch,
      company_id: cid,
      user_id: authUser.value?.id ?? null,
    }
    const { data, error } = await supabase
      .from('bots')
      .insert(insert)
      .select('*')
      .maybeSingle()
    if (error) throw error
    bot.value = data ?? null
  }

  return { bot, refresh, pending, updateBot, canEdit }
}
