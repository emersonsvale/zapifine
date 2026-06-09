function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function usePushNotifications() {
  const config = useRuntimeConfig()
  const authUser = useSupabaseUser()

  const supported = useState<boolean>('push-supported', () => false)
  const permission = useState<NotificationPermission | 'unsupported'>(
    'push-permission',
    () => 'default',
  )
  const subscribed = useState<boolean>('push-subscribed', () => false)
  const busy = ref(false)
  const router = useRouter()

  function checkSupport() {
    if (typeof window === 'undefined') return false
    const ok =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    supported.value = ok
    permission.value = ok ? Notification.permission : 'unsupported'
    return ok
  }

  async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!checkSupport()) return null
    try {
      const existing = await navigator.serviceWorker.getRegistration('/sw.js')
      if (existing) return existing
      return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    } catch (err) {
      console.error('[push] sw register', err)
      return null
    }
  }

  async function refreshStatus() {
    if (!checkSupport()) return
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    if (!reg) {
      subscribed.value = false
      return
    }
    const sub = await reg.pushManager.getSubscription()
    subscribed.value = !!sub
  }

  async function enable(): Promise<{ ok: boolean; reason?: string }> {
    if (!checkSupport()) return { ok: false, reason: 'unsupported' }
    if (!authUser.value?.id) return { ok: false, reason: 'not-authenticated' }

    busy.value = true
    try {
      const perm = await Notification.requestPermission()
      permission.value = perm
      if (perm !== 'granted') return { ok: false, reason: 'permission-denied' }

      const reg = await getRegistration()
      if (!reg) return { ok: false, reason: 'sw-failed' }

      const publicKey =
        (config.public.vapidPublicKey as string) ||
        (await $fetch<{ publicKey: string }>('/api/push/public-key')).publicKey

      if (!publicKey) return { ok: false, reason: 'no-vapid-key' }

      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
      }

      const json = sub.toJSON()
      await $fetch('/api/push/subscribe', {
        method: 'POST',
        body: {
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        },
      })

      subscribed.value = true
      return { ok: true }
    } catch (err) {
      console.error('[push] enable', err)
      return { ok: false, reason: 'error' }
    } finally {
      busy.value = false
    }
  }

  async function disable(): Promise<boolean> {
    if (!checkSupport()) return false
    busy.value = true
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()
        try {
          await $fetch('/api/push/unsubscribe', {
            method: 'POST',
            body: { endpoint },
          })
        } catch {}
      }
      subscribed.value = false
      return true
    } finally {
      busy.value = false
    }
  }

  if (import.meta.client) {
    onMounted(() => {
      checkSupport()
      void refreshStatus()
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
          const data = event.data as { type?: string; url?: string }
          if (data?.type === 'zapifine:navigate' && data.url) {
            router.push(data.url)
          }
        })
      }
    })
  }

  return {
    supported,
    permission,
    subscribed,
    busy,
    enable,
    disable,
    refreshStatus,
  }
}
