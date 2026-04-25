import type { Database } from '~~/types/database'

type HorarioRow = Database['public']['Tables']['agenda_horarios_semanal']['Row']
type ExcecaoRow = Database['public']['Tables']['agenda_excecoes']['Row']

export type HorarioInput = {
  weekday: number // 0=domingo .. 6=sabado
  start_time: string // HH:mm
  end_time: string // HH:mm
  ativo?: boolean
}

export type ExcecaoInput = {
  data: string // YYYY-MM-DD
  kind: 'bloqueio' | 'override'
  start_time?: string | null
  end_time?: string | null
  motivo?: string | null
}

export type TeamMember = {
  id: string
  nome: string | null
  email: string
  funcao_user: string | null
  foto_perfil: string | null
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

export function useDisponibilidade() {
  const { data: current } = useCurrentUser()

  const userId = computed(() => current.value?.id ?? null)
  const isOwner = computed(() => current.value?.funcao_user === 'OWNER')

  const selectedUserId = ref<string | null>(null)

  // Inicializa com user atual quando carrega
  watch(
    userId,
    (id) => {
      if (id && !selectedUserId.value) selectedUserId.value = id
    },
    { immediate: true },
  )

  const teamMembers = useState<TeamMember[]>('disponibilidade-team', () => [])
  const teamPending = ref(false)

  async function loadTeam() {
    teamPending.value = true
    try {
      const res = await $fetch<{ members: TeamMember[] }>(
        '/api/disponibilidade/team-members',
      )
      teamMembers.value = res.members
    } catch (err) {
      throw new Error(asMessage(err))
    } finally {
      teamPending.value = false
    }
  }

  const horarios = ref<HorarioRow[]>([])
  const excecoes = ref<ExcecaoRow[]>([])
  const horariosPending = ref(false)
  const excecoesPending = ref(false)

  async function loadHorarios(targetUserId?: string) {
    const target = targetUserId ?? selectedUserId.value
    if (!target) return
    horariosPending.value = true
    try {
      const res = await $fetch<{ horarios: HorarioRow[] }>(
        `/api/disponibilidade/horarios`,
        { query: { user_id: target } },
      )
      horarios.value = res.horarios
    } catch (err) {
      throw new Error(asMessage(err))
    } finally {
      horariosPending.value = false
    }
  }

  async function saveHorarios(input: { user_id: string; items: HorarioInput[] }) {
    try {
      await $fetch('/api/disponibilidade/horarios', {
        method: 'POST',
        body: input,
      })
      await loadHorarios(input.user_id)
    } catch (err) {
      throw new Error(asMessage(err))
    }
  }

  async function deleteHorario(id: string) {
    try {
      await $fetch(`/api/disponibilidade/horarios/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      horarios.value = horarios.value.filter((h) => h.id !== id)
    } catch (err) {
      throw new Error(asMessage(err))
    }
  }

  async function loadExcecoes(targetUserId?: string) {
    const target = targetUserId ?? selectedUserId.value
    if (!target) return
    excecoesPending.value = true
    try {
      const res = await $fetch<{ excecoes: ExcecaoRow[] }>(
        '/api/disponibilidade/excecoes',
        { query: { user_id: target } },
      )
      excecoes.value = res.excecoes
    } catch (err) {
      throw new Error(asMessage(err))
    } finally {
      excecoesPending.value = false
    }
  }

  async function addExcecao(input: { user_id: string; excecao: ExcecaoInput }) {
    try {
      await $fetch('/api/disponibilidade/excecoes', {
        method: 'POST',
        body: input,
      })
      await loadExcecoes(input.user_id)
    } catch (err) {
      throw new Error(asMessage(err))
    }
  }

  async function deleteExcecao(id: string) {
    try {
      await $fetch(`/api/disponibilidade/excecoes/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      excecoes.value = excecoes.value.filter((e) => e.id !== id)
    } catch (err) {
      throw new Error(asMessage(err))
    }
  }

  return {
    userId,
    isOwner,
    selectedUserId,
    teamMembers,
    teamPending,
    loadTeam,
    horarios,
    horariosPending,
    loadHorarios,
    saveHorarios,
    deleteHorario,
    excecoes,
    excecoesPending,
    loadExcecoes,
    addExcecao,
    deleteExcecao,
  }
}
