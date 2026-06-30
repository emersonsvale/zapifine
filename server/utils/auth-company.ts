import type { H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { useSupabaseAdmin } from './supabase-admin'

export type CurrentUser = {
  auth_id: string
  user_id: string
  companie_id: string
  funcao_user: string | null
}

export async function requireCurrentUser(event: H3Event): Promise<CurrentUser> {
  const authUser = await serverSupabaseUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
  }
  const admin = useSupabaseAdmin()
  const { data, error } = await admin
    .from('users')
    .select('id, companie_id, funcao_user')
    .eq('id', authUser.id)
    .maybeSingle()
  if (error || !data?.companie_id) {
    throw createError({ statusCode: 403, statusMessage: 'Usuário sem empresa associada.' })
  }
  return {
    auth_id: authUser.id,
    user_id: data.id,
    companie_id: data.companie_id,
    funcao_user: data.funcao_user ?? null,
  }
}

export async function assertConnectionOwnership(connectionId: string, companieId: string): Promise<void> {
  const admin = useSupabaseAdmin()
  const { data } = await admin
    .from('whatsapp_connections')
    .select('id, company_id')
    .eq('id', connectionId)
    .maybeSingle()
  if (!data || data.company_id !== companieId) {
    throw createError({ statusCode: 404, statusMessage: 'Conexão não encontrada.' })
  }
}
