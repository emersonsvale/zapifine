import { syncIntegration } from '~~/server/utils/google-sync'
import { findCalendarByChannel } from '~~/server/utils/google-watch'

// Google Calendar Push Notifications
// Headers relevantes:
//   X-Goog-Channel-Id       nosso channel id
//   X-Goog-Channel-Token    nosso verify token
//   X-Goog-Resource-Id      google resource id
//   X-Goog-Resource-State   'sync' (registro inicial) | 'exists' (mudança)
//   X-Goog-Message-Number   incremental
// Google exige 200 rápido. Sync roda "fire-and-forget".

export default defineEventHandler(async (event) => {
  const channelId = getHeader(event, 'x-goog-channel-id')
  const token = getHeader(event, 'x-goog-channel-token')
  const state = getHeader(event, 'x-goog-resource-state')

  if (!channelId || !token) {
    return { ok: false }
  }

  if (state === 'sync') {
    // Notificação inicial após registro. Nenhuma ação.
    return { ok: true }
  }

  const cal = await findCalendarByChannel(channelId, token)
  if (!cal) {
    // Canal desconhecido ou token mismatch — ignora (Google não vai retentar)
    return { ok: false }
  }

  // Fire-and-forget: responde 200 rápido, sync roda em background
  syncIntegration(cal.integration_id).catch((err) => {
    console.warn('[google/webhook] sync fail:', err)
  })

  return { ok: true }
})
