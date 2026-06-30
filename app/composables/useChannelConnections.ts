import type { Database } from '~~/types/database'

export type ChannelType = Database['public']['Enums']['enum_whatsapp_provider']

export type ChannelConnection = {
  id: string
  company_id: string | null
  user_id: string | null
  provider: ChannelType
  display_name: string | null
  external_id: string | null
  is_principal: boolean
  instance_name: string | null
  instance_id: string | null
  apikey_evo: string | null
  uazapi_instance_token: string | null
  cloud_api_phone_number_id: string | null
  is_connected: boolean | null
  connection_status: string | null
  qr_code_url: string | null
  phone_number: string | null
  last_connected_at: string | null
  created_at: string | null
  updated_at: string | null
}

export type ConnectResponse = {
  connection: ChannelConnection
  qrcode?: string | null
  webhookUrl?: string
}

export type ProviderMeta = {
  value: ChannelType
  label: string
  description: string
  available: boolean
}

export const PROVIDER_META: ProviderMeta[] = [
  {
    value: 'whatsapp_evolution',
    label: 'WhatsApp (Evolution)',
    description: 'Não oficial via QR Code. Baseado em whatsmeow/Baileys.',
    available: true,
  },
  {
    value: 'whatsapp_uazapi',
    label: 'WhatsApp (uazapi)',
    description: 'Não oficial via QR Code. Alternativa estável.',
    available: true,
  },
  {
    value: 'whatsapp_cloud',
    label: 'WhatsApp Cloud API',
    description: 'API oficial Meta. Recomendado para volume alto.',
    available: true,
  },
  {
    value: 'instagram',
    label: 'Instagram Direct',
    description: 'Mensagens diretas Instagram via Meta Login.',
    available: true,
  },
  {
    value: 'facebook',
    label: 'Facebook Messenger',
    description: 'Mensagens Messenger via Meta Login.',
    available: true,
  },
]

export function providerLabel(p: ChannelType): string {
  return PROVIDER_META.find((m) => m.value === p)?.label ?? p
}

export function useChannelConnections() {
  const {
    data: connections,
    refresh,
    pending,
  } = useAsyncData<ChannelConnection[]>(
    'channel-connections',
    async () => {
      const res = await $fetch<{ connections: ChannelConnection[] }>('/api/connections')
      return res.connections ?? []
    },
    { default: () => [], server: false },
  )

  const principal = computed(() => connections.value?.find((c) => c.is_principal) ?? null)

  async function createConnection(input: {
    provider: ChannelType
    display_name?: string
    is_principal?: boolean
  }): Promise<ChannelConnection> {
    const res = await $fetch<{ connection: ChannelConnection }>('/api/connections', {
      method: 'POST',
      body: input,
    })
    await refresh()
    return res.connection
  }

  async function connect(id: string, body?: { phone?: string }): Promise<ConnectResponse> {
    const res = await $fetch<ConnectResponse>(`/api/connections/${id}/connect`, {
      method: 'POST',
      body: body ?? {},
    })
    await refresh()
    return res
  }

  async function syncHistory(
    id: string,
    body?: { chatsLimit?: number; messagesPerChat?: number },
  ): Promise<{ ok: boolean; chats: number; imported: number; skipped: number; errors: number }> {
    const res = await $fetch<{
      ok: boolean
      chats: number
      imported: number
      skipped: number
      errors: number
    }>(`/api/connections/${id}/sync`, {
      method: 'POST',
      body: body ?? {},
    })
    return res
  }

  async function checkState(id: string): Promise<{ state: string | null; connected: boolean }> {
    const res = await $fetch<{ state: string | null; connected: boolean }>(`/api/connections/${id}/state`)
    await refresh()
    return res
  }

  async function logout(id: string): Promise<void> {
    await $fetch(`/api/connections/${id}/logout`, { method: 'POST' })
    await refresh()
  }

  async function remove(id: string): Promise<void> {
    await $fetch(`/api/connections/${id}`, { method: 'DELETE' })
    await refresh()
  }

  async function patch(
    id: string,
    body: { display_name?: string; is_principal?: boolean },
  ): Promise<ChannelConnection> {
    const res = await $fetch<{ connection: ChannelConnection }>(`/api/connections/${id}`, {
      method: 'PATCH',
      body,
    })
    await refresh()
    return res.connection
  }

  async function configureCloud(
    id: string,
    body: {
      accessToken: string
      phoneNumberId: string
      wabaId?: string | null
      appId?: string | null
      coexistence?: boolean
    },
  ): Promise<ChannelConnection> {
    const res = await $fetch<{ connection: ChannelConnection }>(
      `/api/connections/${id}/configure-cloud`,
      { method: 'POST', body },
    )
    await refresh()
    return res.connection
  }

  type MetaPage = {
    id: string
    name: string
    access_token: string
    category: string | null
    instagram: { id: string; username: string | null } | null
  }

  async function listMetaPages(id: string): Promise<MetaPage[]> {
    const res = await $fetch<{ pages: MetaPage[] }>(`/api/connections/${id}/meta-pages`)
    return res.pages ?? []
  }

  async function configureMetaPage(
    id: string,
    body: {
      user_access_token: string
      page_id: string
      page_access_token: string
      page_name?: string
      instagram_business_id?: string | null
      app_id?: string | null
    },
  ): Promise<ChannelConnection> {
    const res = await $fetch<{ connection: ChannelConnection }>(
      `/api/connections/${id}/configure-meta-page`,
      { method: 'POST', body },
    )
    await refresh()
    return res.connection
  }

  return {
    connections,
    principal,
    refresh,
    pending,
    createConnection,
    connect,
    syncHistory,
    checkState,
    logout,
    remove,
    patch,
    configureCloud,
    listMetaPages,
    configureMetaPage,
  }
}
