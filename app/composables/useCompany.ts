import type { Database } from '~~/types/database'

type Company = Database['public']['Tables']['companies']['Row']
type CompanyUpdate = Database['public']['Tables']['companies']['Update']

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

export function useCompany() {
  const supabase = useSupabaseClient<Database>()
  const authUser = useSupabaseUser()
  const { data: currentUser } = useCurrentUser()

  const canEdit = computed(
    () => currentUser.value?.funcao_user === 'OWNER',
  )

  const {
    data: company,
    refresh,
    pending,
  } = useAsyncData<Company | null>(
    'company-full',
    async () => {
      const cid = await loadCompanyId(supabase, authUser.value?.id)
      if (!cid) return null
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', cid)
        .maybeSingle()
      if (error) throw error
      return data ?? null
    },
    { watch: [() => authUser.value?.id] },
  )

  async function updateCompany(patch: CompanyUpdate) {
    if (!company.value?.id) throw new Error('Empresa não carregada.')
    const { data, error } = await supabase
      .from('companies')
      .update(patch)
      .eq('id', company.value.id)
      .select('*')
      .maybeSingle()
    if (error) throw error
    if (!data) {
      throw new Error('UPDATE bloqueado pelo RLS (requer OWNER).')
    }
    company.value = data
  }

  return { company, refresh, pending, updateCompany, canEdit }
}
