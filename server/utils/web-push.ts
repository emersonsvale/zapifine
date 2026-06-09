import webpush from 'web-push'

let configured = false

export function getWebPush() {
  if (!configured) {
    const pub = process.env.VAPID_PUBLIC_KEY
    const priv = process.env.VAPID_PRIVATE_KEY
    const subject = process.env.VAPID_SUBJECT || 'mailto:suporte@zapifine.com'
    if (!pub || !priv) {
      throw new Error('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY ausentes no .env.')
    }
    webpush.setVapidDetails(subject, pub, priv)
    configured = true
  }
  return webpush
}
