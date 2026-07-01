export type AgentTipo = 'orchestrator' | 'specialist'

export type AiAgent = {
  id: string
  company_id: string
  nome: string
  tipo: AgentTipo
  model: string
  system_prompt: string
  temperature: number | null
  is_active: boolean
  metadata: Record<string, unknown>
  created_at: string | null
  updated_at: string | null
}

export type ToolCatalogItem = {
  slug: string
  name: string
  description: string
  parameters: Record<string, unknown>
}

export type AgentWithConfig = {
  agent: AiAgent
  tools: Array<{ tool_slug: string; config: Record<string, unknown> }>
  specialists: Array<{ specialist_id: string; when_use_hint: string }>
}

export function useAiAgents() {
  async function list(): Promise<AiAgent[]> {
    const res = await $fetch<{ agents: AiAgent[] }>('/api/ai/agents')
    return res.agents ?? []
  }

  async function get(id: string): Promise<AgentWithConfig> {
    return await $fetch<AgentWithConfig>(`/api/ai/agents/${id}`)
  }

  async function create(input: {
    nome: string
    tipo: AgentTipo
    model?: string
    system_prompt: string
    temperature?: number
    is_active?: boolean
  }): Promise<AiAgent> {
    const res = await $fetch<{ agent: AiAgent }>('/api/ai/agents', {
      method: 'POST',
      body: input,
    })
    return res.agent
  }

  async function patch(id: string, input: Partial<Omit<AiAgent, 'id' | 'company_id'>>): Promise<AiAgent> {
    const res = await $fetch<{ agent: AiAgent }>(`/api/ai/agents/${id}`, {
      method: 'PATCH',
      body: input,
    })
    return res.agent
  }

  async function remove(id: string): Promise<void> {
    await $fetch(`/api/ai/agents/${id}`, { method: 'DELETE' })
  }

  async function setTools(id: string, tool_slugs: string[]): Promise<void> {
    await $fetch(`/api/ai/agents/${id}/tools`, { method: 'PUT', body: { tool_slugs } })
  }

  async function setSpecialists(
    id: string,
    specialists: Array<{ specialist_id: string; when_use_hint: string }>,
  ): Promise<void> {
    await $fetch(`/api/ai/agents/${id}/specialists`, { method: 'PUT', body: { specialists } })
  }

  async function toolsCatalog(): Promise<ToolCatalogItem[]> {
    const res = await $fetch<{ tools: ToolCatalogItem[] }>('/api/ai/tools-catalog')
    return res.tools ?? []
  }

  async function getBinding(whatsapp_connection_id: string): Promise<{ binding: unknown | null }> {
    return await $fetch<{ binding: unknown | null }>(`/api/ai/binding/${whatsapp_connection_id}` as string)
  }

  async function setBinding(input: {
    whatsapp_connection_id: string
    orchestrator_agent_id: string
    group_trigger_prefix?: string
  }): Promise<void> {
    await $fetch('/api/ai/binding', { method: 'PUT', body: input })
  }

  async function pauseConversa(conversa_id: number): Promise<void> {
    await $fetch(`/api/ai/conversation/${conversa_id}/pause`, { method: 'POST' })
  }

  async function resumeConversa(conversa_id: number): Promise<void> {
    await $fetch(`/api/ai/conversation/${conversa_id}/resume`, { method: 'POST' })
  }

  async function getConversaState(conversa_id: number): Promise<{ state: { is_paused: boolean } | null }> {
    return await $fetch<{ state: { is_paused: boolean } | null }>(`/api/ai/conversation/${conversa_id}` as string)
  }

  return {
    list,
    get,
    create,
    patch,
    remove,
    setTools,
    setSpecialists,
    toolsCatalog,
    getBinding,
    setBinding,
    pauseConversa,
    resumeConversa,
    getConversaState,
  }
}
