import type { Database } from '~~/types/database'

type Product = Database['public']['Tables']['produtos']['Row']
type ProductInsert = Database['public']['Tables']['produtos']['Insert']
type ProductUpdate = Database['public']['Tables']['produtos']['Update']

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

export function useProducts() {
  const supabase = useSupabaseClient<Database>()
  const authUser = useSupabaseUser()

  const companyId = useState<string | null>('products-company-id', () => null)

  const {
    data: products,
    refresh,
    pending,
  } = useAsyncData<Product[]>(
    'products',
    async () => {
      const cid = await loadCompanyId(supabase, authUser.value?.id)
      companyId.value = cid
      if (!cid) return []
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('companies_id', cid)
        .order('id', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    { watch: [() => authUser.value?.id], default: () => [] },
  )

  async function syncKnowledge(id: number) {
    try {
      await $fetch(`/api/produtos/${id}/sync-knowledge`, { method: 'POST' })
    } catch {
      // best effort: falha na sync não deve reverter a operação principal
    }
  }

  async function createProduct(input: {
    nome: string
    descricao?: string
    preco?: number | null
    exibir_preco?: boolean
    imagem_principal?: string | null
  }) {
    if (!companyId.value) throw new Error('Empresa não associada.')
    const insert: ProductInsert = {
      companies_id: companyId.value,
      nome: input.nome.trim(),
      descricao: input.descricao?.trim() || null,
      preco: input.preco ?? null,
      exibir_preco: input.exibir_preco ?? false,
      imagem_principal: input.imagem_principal ?? null,
      ativo: true,
    }
    const { data, error } = await supabase
      .from('produtos')
      .insert(insert)
      .select('id')
      .single()
    if (error) throw error
    const newId = (data as { id: number } | null)?.id
    if (newId) void syncKnowledge(newId)
    await refresh()
  }

  async function updateProduct(id: number, patch: ProductUpdate) {
    // Optimistic
    const p = products.value?.find((x) => x.id === id)
    const prev = p ? { ...p } : null
    if (p) Object.assign(p, patch)
    const { error } = await supabase
      .from('produtos')
      .update(patch)
      .eq('id', id)
    if (error) {
      if (p && prev) Object.assign(p, prev)
      throw error
    }
    void syncKnowledge(id)
  }

  async function deleteProduct(id: number) {
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    if (error) throw error
    void syncKnowledge(id)
    await refresh()
  }

  return {
    products,
    refresh,
    pending,
    createProduct,
    updateProduct,
    deleteProduct,
  }
}
