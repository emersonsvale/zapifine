import type { Database } from '~~/types/database'

export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient<Database>()
  const authUser = useSupabaseUser()
  const { unreadCount, refresh: refreshUnread } = useUnreadChats()
  const { toast } = useAlerts()
  const router = useRouter()

  let channel: ReturnType<typeof supabase.channel> | null = null
  let audioCtx: AudioContext | null = null

  function notifSupported() {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  async function ensureNotifPermission() {
    if (!notifSupported()) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    try {
      const res = await Notification.requestPermission()
      return res === 'granted'
    } catch {
      return false
    }
  }

  // Pede permissão no primeiro gesto do usuário (Chrome exige user activation)
  if (typeof window !== 'undefined' && notifSupported() && Notification.permission === 'default') {
    const handler = () => { void ensureNotifPermission() }
    window.addEventListener('click', handler, { once: true, capture: true })
    window.addEventListener('keydown', handler, { once: true, capture: true })
  }

  function showSystemNotification(opts: {
    title: string
    body: string
    convId: number | null
  }) {
    if (!notifSupported() || Notification.permission !== 'granted') return
    try {
      const n = new Notification(opts.title, {
        body: opts.body,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: opts.convId ? `chat-${opts.convId}` : 'chat',
        renotify: true,
      } as NotificationOptions & { renotify?: boolean })
      n.onclick = () => {
        window.focus()
        if (opts.convId) router.push(`/multiatendimento/chats?conv=${opts.convId}`)
        else router.push('/multiatendimento/chats')
        n.close()
      }
    } catch {}
  }

  function playBeep() {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      if (!Ctx) return
      if (!audioCtx) audioCtx = new Ctx()
      if (audioCtx.state === 'suspended') void audioCtx.resume()
      const now = audioCtx.currentTime
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)
      osc.connect(gain).connect(audioCtx.destination)
      osc.start(now)
      osc.stop(now + 0.42)
    } catch {}
  }

  async function syncAuth() {
    try {
      const { data } = await supabase.auth.getSession()
      // @ts-expect-error runtime method
      supabase.realtime.setAuth(data.session?.access_token ?? null)
    } catch {}
  }

  async function resolveConvName(convId: number): Promise<string> {
    try {
      const { data } = await supabase
        .from('whats_conversa')
        .select(
          'isgrupo, "grupoNome", "remoteJid", leads(nome_lead, numero_whatsapp_lead)' as never,
        )
        .eq('id', convId)
        .maybeSingle()
      const c = data as unknown as {
        isgrupo?: boolean
        grupoNome?: string | null
        remoteJid?: string | null
        leads?: {
          nome_lead?: string | null
          numero_whatsapp_lead?: string | null
        } | null
      } | null
      if (!c) return 'WhatsApp'
      if (c.isgrupo) return c.grupoNome?.trim() || 'Grupo'
      return (
        c.leads?.nome_lead?.trim() ||
        c.leads?.numero_whatsapp_lead ||
        c.remoteJid ||
        'WhatsApp'
      )
    } catch {
      return 'WhatsApp'
    }
  }

  function previewOf(row: {
    mensagem: string | null
    tipo: string | null
  }): string {
    const txt = row.mensagem?.trim()
    if (txt) return txt.length > 120 ? txt.slice(0, 117) + '...' : txt
    const tipo = (row.tipo || '').toLowerCase()
    if (tipo.includes('image') || tipo === 'imagem') return '📷 Imagem'
    if (tipo.includes('video')) return '🎬 Vídeo'
    if (tipo.includes('audio') || tipo === 'audio') return '🎙️ Áudio'
    if (tipo === 'location' || tipo === 'localizacao') return '📍 Localização'
    if (tipo === 'contact' || tipo === 'contato') return '👤 Contato'
    if (tipo === 'poll' || tipo === 'enquete') return '📊 Enquete'
    if (tipo.includes('document') || tipo === 'documento') return '📎 Documento'
    if (tipo === 'link') return '🔗 Link'
    return '[mídia]'
  }

  async function subscribe() {
    if (channel) {
      await supabase.removeChannel(channel)
      channel = null
    }
    if (!authUser.value?.id) return
    await syncAuth()
    channel = supabase
      .channel(`chats-notify-${authUser.value.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whats_mensagens_conversa',
        },
        async (payload) => {
          const row = payload.new as {
            id: number
            whats_conversa_id: number | null
            status: string | null
            mensagem: string | null
            tipo: string | null
            midia_url: string | null
          }
          if (row.status !== 'Recebida') return

          refreshUnread()

          const path =
            typeof window !== 'undefined' ? window.location.pathname : ''
          const onChatsPage = path.startsWith('/multiatendimento/chats')
          const tabHidden = typeof document !== 'undefined' && document.visibilityState !== 'visible'

          // Já está vendo a tela de chats com aba focada: nada a fazer
          if (onChatsPage && !tabHidden) return

          const convId = row.whats_conversa_id
          const title = convId ? await resolveConvName(convId) : 'WhatsApp'
          const message = previewOf(row)

          playBeep()

          // Tab em background OU outra aba aberta: usa notificação nativa do SO
          if (tabHidden) {
            showSystemNotification({ title, body: message, convId })
            return
          }

          // Tab visível em outra página do app: toast in-app + tenta system notif também
          showSystemNotification({ title, body: message, convId })
          toast.info(message, {
            title,
            timeout: 7000,
            onClick: () => {
              if (convId) {
                router.push(`/multiatendimento/chats?conv=${convId}`)
              } else {
                router.push('/multiatendimento/chats')
              }
            },
          })
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[chats-realtime] status:', status)
        }
      })
  }

  watch(() => authUser.value?.id, () => void subscribe(), { immediate: true })
  supabase.auth.onAuthStateChange(() => void syncAuth())

  if (import.meta.client) {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      void syncAuth()
      refreshUnread()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    const TITLE_PREFIX_RE = /^\(\d+\)\s+/
    let baseTitle = document.title.replace(TITLE_PREFIX_RE, '')
    let applyingTitle = false

    function applyTitle() {
      const n = unreadCount.value
      const next = n > 0 ? `(${n}) ${baseTitle}` : baseTitle
      if (document.title === next) return
      applyingTitle = true
      document.title = next
      queueMicrotask(() => {
        applyingTitle = false
      })
    }

    const titleEl = document.querySelector('title')
    if (titleEl) {
      const observer = new MutationObserver(() => {
        if (applyingTitle) return
        baseTitle = document.title.replace(TITLE_PREFIX_RE, '')
        applyTitle()
      })
      observer.observe(titleEl, { childList: true, characterData: true, subtree: true })
    }

    watch(unreadCount, () => applyTitle(), { immediate: true })
  }
})
