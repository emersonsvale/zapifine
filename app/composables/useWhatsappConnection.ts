import type { Database } from '~~/types/database'

type WhatsappConnection =
  Database['public']['Tables']['whatsapp_connections']['Row']

export type WhatsappProvider = 'evolution' | 'cloud_api'

type EvoCreateResponse = {
  instance?: { instanceName?: string; instanceId?: string; status?: string }
  hash?: string | { apikey?: string }
  qrcode?: { base64?: string; code?: string }
}

type EvoConnectResponse = {
  base64?: string
  code?: string
  qrcode?: { base64?: string; code?: string }
}

type EvoStateResponse = {
  instance?: { state?: 'open' | 'close' | 'connecting' | string }
}

export type CloudVerifyResult = {
  ok: boolean
  phoneNumberId: string
  displayPhoneNumber: string | null
  verifiedName: string | null
  nameStatus: string | null
  qualityRating: string | null
  wabaId: string | null
}

function parseEvoApiKey(hash: EvoCreateResponse['hash']): string | null {
  if (!hash) return null
  if (typeof hash === 'string') return hash
  return hash.apikey ?? null
}

function makeInstanceName(companyId: string) {
  return `zap-${companyId.replace(/-/g, '').slice(0, 16)}`
}

function randomToken(bytes = 24) {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const arr = new Uint8Array(bytes)
    crypto.getRandomValues(arr)
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return Math.random().toString(36).slice(2)
}

export function useWhatsappConnection() {
  const supabase = useSupabaseClient<Database>()
  const { data: currentUser } = useCurrentUser()
  const authUser = useSupabaseUser()

  const companyId = computed(() => currentUser.value?.companie_id ?? null)

  const {
    data: connection,
    refresh,
    pending,
  } = useAsyncData<WhatsappConnection | null>(
    'whatsapp-connection',
    async () => {
      if (!companyId.value) return null
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('company_id', companyId.value)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data ?? null
    },
    { watch: [companyId] },
  )

  const provider = computed<WhatsappProvider>(
    () => (connection.value?.provider as WhatsappProvider) ?? 'evolution',
  )

  const isConnected = computed(
    () =>
      !!connection.value?.is_connected ||
      connection.value?.connection_status === 'open',
  )

  const statusLabel = computed(() => {
    const c = connection.value
    if (!c) return 'Whatsapp Desconectado'
    if (isConnected.value) return 'WhatsApp Conectado'
    if (c.provider === 'cloud_api') return 'Aguardando configuração Cloud API'
    switch (c.connection_status) {
      case 'connecting':
      case 'pairing':
        return 'Conectando...'
      case 'qr':
        return 'Escaneie o QR Code'
      default:
        return 'Whatsapp Desconectado'
    }
  })

  async function invokeEdge<T>(
    path: string,
    options: { method?: 'POST' | 'GET' | 'DELETE'; body?: unknown } = {},
  ): Promise<T> {
    const { data, error } = await supabase.functions.invoke<T>(path, {
      method: options.method ?? 'POST',
      body: options.body,
    })
    if (error) throw error
    return data as T
  }

  // -------- Evolution (Baileys) flow --------

  async function generateQr() {
    if (!companyId.value || !authUser.value?.id) {
      throw new Error('Usuário sem empresa associada.')
    }

    const existing = connection.value
    const isEvo = !existing || existing.provider === 'evolution'
    let instanceName =
      existing?.instance_name ?? makeInstanceName(companyId.value)
    let instanceId = existing?.instance_id ?? null
    let apiKey = existing?.apikey_evo ?? null
    let qrBase64: string | null = null

    if (!existing || !existing.instance_name || !isEvo) {
      const res = await invokeEdge<EvoCreateResponse>('evo-createinstance', {
        method: 'POST',
        body: {
          instanceName,
          companyId: companyId.value,
        },
      })
      instanceName = res.instance?.instanceName ?? instanceName
      instanceId = res.instance?.instanceId ?? instanceId
      apiKey = parseEvoApiKey(res.hash) ?? apiKey
      qrBase64 = res.qrcode?.base64 ?? null
    } else {
      const res = await invokeEdge<EvoConnectResponse>(
        `evo-instanceconnect?instance=${encodeURIComponent(instanceName)}`,
        { method: 'GET' },
      )
      qrBase64 = res.base64 ?? res.qrcode?.base64 ?? null
    }

    const patch: Database['public']['Tables']['whatsapp_connections']['Update'] =
      {
        company_id: companyId.value,
        user_id: authUser.value.id,
        provider: 'evolution',
        instance_name: instanceName,
        instance_id: instanceId,
        apikey_evo: apiKey,
        qr_code_url: qrBase64,
        connection_status: 'qr',
        is_connected: false,
        updated_at: new Date().toISOString(),
      }

    if (existing?.id) {
      const { error } = await supabase
        .from('whatsapp_connections')
        .update(patch)
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('whatsapp_connections')
        .insert(patch)
      if (error) throw error
    }

    await refresh()
    startPolling()
  }

  async function disconnect() {
    const c = connection.value
    if (!c) return

    if (c.provider === 'evolution' && c.instance_name) {
      try {
        await invokeEdge(
          `evo-logoutinstance?instance=${encodeURIComponent(c.instance_name)}`,
          { method: 'DELETE' },
        )
      } catch {
        // swallow, flip state anyway
      }
    }

    const { error } = await supabase
      .from('whatsapp_connections')
      .update({
        is_connected: false,
        connection_status: 'close',
        qr_code_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', c.id)
    if (error) throw error

    stopPolling()
    await refresh()
  }

  async function checkState() {
    const c = connection.value
    if (!c || c.provider !== 'evolution' || !c.instance_name) return
    try {
      const res = await invokeEdge<EvoStateResponse>(
        `evo-connectionState?instance=${encodeURIComponent(c.instance_name)}`,
        { method: 'GET' },
      )
      const state = res.instance?.state
      if (!state) return
      const connected = state === 'open'
      if (connected && !c.is_connected) {
        await supabase
          .from('whatsapp_connections')
          .update({
            is_connected: true,
            connection_status: 'open',
            last_connected_at: new Date().toISOString(),
            qr_code_url: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', c.id)
        await refresh()
        stopPolling()
      } else if (c.connection_status !== state) {
        await supabase
          .from('whatsapp_connections')
          .update({ connection_status: state })
          .eq('id', c.id)
        await refresh()
      }
    } catch {
      // swallow
    }
  }

  // -------- Cloud API (Meta) flow --------

  type CloudSetupInput = {
    accessToken: string
    phoneNumberId: string
    wabaId?: string | null
    appId?: string | null
    coexistence?: boolean
  }

  async function verifyCloudApi(
    input: Pick<CloudSetupInput, 'accessToken' | 'phoneNumberId'>,
  ): Promise<CloudVerifyResult> {
    return await $fetch<CloudVerifyResult>('/api/whatsapp/cloud/verify', {
      method: 'POST',
      body: input,
    })
  }

  async function saveCloudApi(input: CloudSetupInput) {
    if (!companyId.value || !authUser.value?.id) {
      throw new Error('Usuário sem empresa associada.')
    }

    const verified = await verifyCloudApi({
      accessToken: input.accessToken,
      phoneNumberId: input.phoneNumberId,
    })

    const existing = connection.value
    const webhookToken =
      existing?.cloud_api_webhook_verify_token ?? randomToken()

    const patch: Database['public']['Tables']['whatsapp_connections']['Update'] =
      {
        company_id: companyId.value,
        user_id: authUser.value.id,
        provider: 'cloud_api',
        phone_number: verified.displayPhoneNumber ?? null,
        connection_status: 'open',
        is_connected: true,
        last_connected_at: new Date().toISOString(),
        qr_code_url: null,
        instance_name: null,
        instance_id: null,
        apikey_evo: null,
        cloud_api_phone_number_id: verified.phoneNumberId,
        cloud_api_waba_id: input.wabaId ?? verified.wabaId ?? null,
        cloud_api_access_token: input.accessToken,
        cloud_api_app_id: input.appId ?? null,
        cloud_api_display_name: verified.displayPhoneNumber ?? null,
        cloud_api_verified_name: verified.verifiedName ?? null,
        cloud_api_coexistence: input.coexistence ?? false,
        cloud_api_webhook_verify_token: webhookToken,
        updated_at: new Date().toISOString(),
      }

    if (existing?.id) {
      const { error } = await supabase
        .from('whatsapp_connections')
        .update(patch)
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('whatsapp_connections')
        .insert(patch)
      if (error) throw error
    }

    await refresh()
    return verified
  }

  async function disconnectCloudApi() {
    const c = connection.value
    if (!c) return
    const { error } = await supabase
      .from('whatsapp_connections')
      .update({
        is_connected: false,
        connection_status: 'close',
        cloud_api_access_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', c.id)
    if (error) throw error
    await refresh()
  }

  // -------- Polling (Evolution only) --------

  let pollTimer: ReturnType<typeof setInterval> | null = null
  function startPolling() {
    stopPolling()
    if (!import.meta.client) return
    if (provider.value !== 'evolution') return
    pollTimer = setInterval(() => {
      if (isConnected.value) {
        stopPolling()
        return
      }
      checkState()
    }, 4000)
  }
  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }
  onBeforeUnmount(stopPolling)

  return {
    connection,
    refresh,
    pending,
    isConnected,
    statusLabel,
    provider,
    companyId,
    // Evolution
    generateQr,
    disconnect,
    checkState,
    startPolling,
    stopPolling,
    // Cloud API
    verifyCloudApi,
    saveCloudApi,
    disconnectCloudApi,
  }
}
