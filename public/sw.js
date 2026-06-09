// Zapifine Service Worker - Web Push + foco em aba existente

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'WhatsApp', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'WhatsApp'
  const options = {
    body: data.body || '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: data.tag || 'zapifine-chat',
    renotify: true,
    data: { url: data.url || '/multiatendimento/chats' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        try {
          const u = new URL(client.url)
          if (u.origin === self.location.origin) {
            client.focus()
            client.postMessage({ type: 'zapifine:navigate', url: targetUrl })
            return
          }
        } catch {}
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})
