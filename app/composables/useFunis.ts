import type { Database } from '~~/types/database'

type FunilRow = Database['public']['Tables']['ff_funil']['Row']

export function useFunis() {
  const supabase = useSupabaseClient<Database>()
  const authUser = useSupabaseUser()
  const { data: currentUser } = useCurrentUser()

  const isOwner = computed(
    () => currentUser.value?.funcao_user === 'OWNER',
  )

  const companyId = computed<string | null>(
    () => currentUser.value?.companie_id ?? null,
  )

  const defaultFunilId = computed<number | null>(
    () => currentUser.value?.companies?.funil_incial_id ?? null,
  )

  const activeFunilId = useState<number | null>('active-funil-id', () => null)

  const {
    data: funis,
    refresh: refreshFunis,
    pending: funisPending,
  } = useAsyncData<FunilRow[]>(
    'ff-funis',
    async () => {
      if (!companyId.value) return []
      const { data, error } = await supabase
        .from('ff_funil')
        .select('*')
        .eq('companie_id', companyId.value)
        .order('id', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    { watch: [companyId], default: () => [] },
  )

  watchEffect(() => {
    const list = funis.value ?? []
    if (!list.length) return
    const current = activeFunilId.value
    if (current && list.some((f) => f.id === current)) return
    activeFunilId.value = defaultFunilId.value ?? list[0]!.id
  })

  const activeFunil = computed<FunilRow | null>(() => {
    const id = activeFunilId.value
    if (id == null) return null
    return funis.value?.find((f) => f.id === id) ?? null
  })

  function isDefaultFunil(funilId: number | null | undefined): boolean {
    if (funilId == null) return false
    return defaultFunilId.value === funilId
  }

  async function createFunil(nome: string): Promise<number> {
    if (!isOwner.value) throw new Error('Apenas OWNER pode criar funis.')
    const { data, error } = await supabase.rpc('create_funil_with_defaults' as never, {
      p_nome: nome.trim(),
    } as never)
    if (error) throw error
    await refreshFunis()
    const newId = data as unknown as number
    if (typeof newId === 'number') activeFunilId.value = newId
    return newId
  }

  async function renameFunil(funilId: number, nome: string): Promise<void> {
    if (!isOwner.value) throw new Error('Apenas OWNER pode renomear funis.')
    const trimmed = nome.trim()
    if (!trimmed) throw new Error('Nome do funil obrigatório.')
    const { error } = await supabase
      .from('ff_funil')
      .update({ nome_funil: trimmed })
      .eq('id', funilId)
    if (error) throw error
    await refreshFunis()
  }

  async function deleteFunil(funilId: number, targetFunilId: number): Promise<void> {
    if (!isOwner.value) throw new Error('Apenas OWNER pode excluir funis.')
    if (isDefaultFunil(funilId)) {
      throw new Error('O funil padrão da empresa não pode ser excluído.')
    }
    const { error } = await supabase.rpc('delete_funil_and_move_leads' as never, {
      p_funil_id: funilId,
      p_target_funil_id: targetFunilId,
    } as never)
    if (error) throw error
    if (activeFunilId.value === funilId) activeFunilId.value = targetFunilId
    await refreshFunis()
  }

  return {
    funis,
    funisPending,
    refreshFunis,
    activeFunilId,
    activeFunil,
    defaultFunilId,
    isDefaultFunil,
    isOwner,
    createFunil,
    renameFunil,
    deleteFunil,
    authUser,
  }
}
