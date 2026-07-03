import { serverSupabaseUser } from '#supabase/server'
import { useSupabaseAdmin } from '~~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const out: Record<string, unknown> = {}

  try {
    const authUser = await serverSupabaseUser(event)
    out.authUserId = authUser?.id ?? null
  } catch (err) {
    out.serverSupabaseUserError = err instanceof Error ? err.message : String(err)
  }

  try {
    const admin = useSupabaseAdmin()
    const { data, error } = await admin.from('users').select('id, companie_id').limit(1)
    out.adminQuery = { data, error: error?.message ?? null }
  } catch (err) {
    out.adminError = err instanceof Error ? err.message : String(err)
  }

  return out
})
