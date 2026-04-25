import type { Database } from '~~/types/database'

type TemplateRow = Database['public']['Tables']['agenda_templates']['Row']

export type TemplateChannel = 'app' | 'whatsapp'
export type TemplateKind =
  | 'lembrete'
  | 'confirmacao'
  | 'cancelamento'
  | 'novo_agendamento'

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

export function useAgendaTemplates() {
  const templates = useState<TemplateRow[]>('agenda-templates', () => [])
  const pending = ref(false)

  async function load() {
    pending.value = true
    try {
      const res = await $fetch<{ templates: TemplateRow[] }>('/api/agenda-templates')
      templates.value = res.templates
    } catch (err) {
      throw new Error(asMessage(err))
    } finally {
      pending.value = false
    }
  }

  async function create(input: {
    channel: TemplateChannel
    kind: TemplateKind
    minutes_before?: number | null
    title?: string | null
    body: string
    ativo?: boolean
  }) {
    try {
      await $fetch('/api/agenda-templates', { method: 'POST', body: input })
      await load()
    } catch (err) {
      throw new Error(asMessage(err))
    }
  }

  async function update(id: string, patch: {
    title?: string | null
    body?: string
    ativo?: boolean
    minutes_before?: number | null
  }) {
    try {
      await $fetch(`/api/agenda-templates/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: patch,
      })
      await load()
    } catch (err) {
      throw new Error(asMessage(err))
    }
  }

  async function remove(id: string) {
    try {
      await $fetch(`/api/agenda-templates/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      templates.value = templates.value.filter((t) => t.id !== id)
    } catch (err) {
      throw new Error(asMessage(err))
    }
  }

  return { templates, pending, load, create, update, remove }
}
