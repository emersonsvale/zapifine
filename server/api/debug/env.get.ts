export default defineEventHandler(() => {
  const keys = [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_GW_SECRET',
    'WHATS_API_INTERNAL_URL',
    'WHATS_API_INTERNAL_SECRET',
    'WHATS_API_URL',
    'EVO_API_URL',
    'EVO_GLOBAL_API_KEY',
    'META_APP_ID',
    'META_CONFIG_ID',
    'META_APP_SECRET',
    'META_GRAPH_VERSION',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'CRON_SECRET',
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_SUBJECT',
    'NODE_ENV',
  ]
  const out: Record<string, string> = {}
  for (const k of keys) {
    const v = process.env[k]
    out[k] = v ? `set(len=${v.length})` : 'MISSING'
  }
  return out
})
