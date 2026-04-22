import type { Database } from '~~/types/database'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const user = useSupabaseUser()
  if (!user.value?.id) return

  const publicPaths = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/confirm',
    '/onboarding',
  ]
  if (publicPaths.some((p) => to.path === p || to.path.startsWith(`${p}/`))) {
    return
  }

  const supabase = useSupabaseClient<Database>()
  const { data } = await supabase
    .from('users')
    .select('is_onboarding_complete')
    .eq('id', user.value.id)
    .maybeSingle()

  if (data && data.is_onboarding_complete === false) {
    return navigateTo('/onboarding', { replace: true })
  }
})
