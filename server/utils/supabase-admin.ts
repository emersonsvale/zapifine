import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~~/types/database'

let cached: SupabaseClient<Database> | null = null

export function useSupabaseAdmin(): SupabaseClient<Database> {
  if (cached) return cached

  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes no .env.',
    })
  }

  const headers: Record<string, string> = {}
  if (process.env.SUPABASE_GW_SECRET) {
    headers['x-zapifine-gw'] = process.env.SUPABASE_GW_SECRET
  }
  if (process.env.NODE_ENV !== 'production') {
    headers.origin = 'http://localhost:3000'
  }

  cached = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers },
  })
  return cached
}
