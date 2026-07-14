export type FlowTriggerType =
  | 'lead_new_message'
  | 'lead_archived_message'
  | 'lead_in_service_message'
  | 'lead_column_changed'
  | 'manual_chat'
  | 'instagram_comment'

export type FlowStatus = 'draft' | 'published' | 'archived'

export type FlowSummary = {
  id: string
  name: string
  trigger_type: FlowTriggerType
  trigger_config: Record<string, unknown>
  status: FlowStatus
  version: number
  published_version: number | null
  on_conflict: 'skip' | 'queue' | 'abort_previous'
  default_message_delay_ms: number
  created_at: string
  updated_at: string
  published_at: string | null
}

export type FlowNode = {
  id: string
  type: string
  label?: string
  next?: string | null
  position?: { x: number; y: number }
  config?: Record<string, unknown>
}

export type FlowEdge = {
  from: string
  to: string
  branch?: string
}

export type FlowGraph = {
  nodes: FlowNode[]
  edges: FlowEdge[]
  entry?: string
}

export type FlowDetail = FlowSummary & {
  graph: FlowGraph
  published_graph: FlowGraph | null
  companies_id: string
}

function asMessage(err: unknown): string {
  const e = err as {
    statusMessage?: string
    data?: { statusMessage?: string; message?: string }
    message?: string
  }
  return (
    e?.data?.statusMessage
    ?? e?.statusMessage
    ?? e?.data?.message
    ?? e?.message
    ?? 'Erro desconhecido'
  )
}

export function useFlows() {
  const flows = useState<FlowSummary[]>('flows-list', () => [])
  const pending = ref(false)

  async function load() {
    pending.value = true
    try {
      const res = await $fetch<{ flows: FlowSummary[] }>('/api/flows')
      flows.value = res.flows
    } catch (err) {
      throw new Error(asMessage(err))
    } finally {
      pending.value = false
    }
  }

  async function create(input: {
    name: string
    trigger_type: FlowTriggerType
    trigger_config?: Record<string, unknown>
    graph?: FlowGraph
    on_conflict?: 'skip' | 'queue' | 'abort_previous'
    default_message_delay_ms?: number
  }): Promise<string> {
    try {
      const res = await $fetch<{ id: string }>('/api/flows', {
        method: 'POST',
        body: input,
      })
      await load()
      return res.id
    } catch (err) {
      throw new Error(asMessage(err))
    }
  }

  async function remove(id: string) {
    try {
      await $fetch(`/api/flows/${encodeURIComponent(id)}`, { method: 'DELETE' })
      flows.value = flows.value.filter((f) => f.id !== id)
    } catch (err) {
      throw new Error(asMessage(err))
    }
  }

  return { flows, pending, load, create, remove }
}

export function useFlow(id: MaybeRefOrGetter<string>) {
  const flow = ref<FlowDetail | null>(null)
  const pending = ref(false)
  const saving = ref(false)

  async function load() {
    const flowId = toValue(id)
    if (!flowId) return
    pending.value = true
    try {
      const res = await $fetch<{ flow: FlowDetail }>(`/api/flows/${encodeURIComponent(flowId)}`)
      flow.value = res.flow
    } catch (err) {
      throw new Error(asMessage(err))
    } finally {
      pending.value = false
    }
  }

  async function save(patch: {
    name?: string
    trigger_type?: FlowTriggerType
    trigger_config?: Record<string, unknown>
    graph?: FlowGraph
    on_conflict?: 'skip' | 'queue' | 'abort_previous'
    default_message_delay_ms?: number
  }) {
    const flowId = toValue(id)
    if (!flowId) return
    saving.value = true
    try {
      await $fetch(`/api/flows/${encodeURIComponent(flowId)}`, {
        method: 'PATCH',
        body: patch,
      })
    } catch (err) {
      throw new Error(asMessage(err))
    } finally {
      saving.value = false
    }
  }

  async function publish() {
    const flowId = toValue(id)
    if (!flowId) return null
    try {
      const res = await $fetch<{ ok: boolean; version: number }>(
        `/api/flows/${encodeURIComponent(flowId)}/publish`,
        { method: 'POST' },
      )
      await load()
      return res.version
    } catch (err) {
      throw new Error(asMessage(err))
    }
  }

  return { flow, pending, saving, load, save, publish }
}
