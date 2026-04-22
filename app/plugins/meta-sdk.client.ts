declare global {
  interface Window {
    FB?: {
      init: (opts: Record<string, unknown>) => void
      login: (
        cb: (response: {
          authResponse?: { code?: string; accessToken?: string }
          status?: string
        }) => void,
        opts: Record<string, unknown>,
      ) => void
    }
    fbAsyncInit?: () => void
  }
}

export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  const config = useRuntimeConfig()
  const appId = config.public.metaAppId as string
  if (!appId) return

  if (window.FB) return

  window.fbAsyncInit = () => {
    window.FB?.init({
      appId,
      cookie: true,
      xfbml: true,
      version: (config.public.metaGraphVersion as string) || 'v20.0',
    })
  }

  const existing = document.getElementById('facebook-jssdk')
  if (existing) return

  const script = document.createElement('script')
  script.id = 'facebook-jssdk'
  script.src = 'https://connect.facebook.net/pt_BR/sdk.js'
  script.async = true
  script.defer = true
  script.crossOrigin = 'anonymous'
  document.head.appendChild(script)
})
