import type { Database } from '~~/types/database'

type AppUserRow = Database['public']['Tables']['users']['Row']
type CompanyRow = Database['public']['Tables']['companies']['Row']

type UserWithCompany = AppUserRow & {
  companies: CompanyRow | null
}

export function useCurrentUser() {
  const supabase = useSupabaseClient<Database>()
  const authUser = useSupabaseUser()

  return useAsyncData<UserWithCompany | null>(
    'current-user',
    async () => {
      if (!authUser.value?.id) return null
      const { data, error } = await supabase
        .from('users')
        .select('*, companies:companie_id(*)')
        .eq('id', authUser.value.id)
        .maybeSingle()
      if (error) throw error
      return (data as UserWithCompany) ?? null
    },
    { watch: [authUser] },
  )
}
