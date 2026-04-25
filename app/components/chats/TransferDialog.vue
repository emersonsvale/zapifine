<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Loader2, Search, User as UserIcon, Tag } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type AppUser = Database['public']['Tables']['users']['Row'] & {
  setor_id?: string | null
}

type Setor = { id: string; nome: string; cor: string | null; descricao: string | null }

type Mode = 'user' | 'setor'

const props = defineProps<{
  open: boolean
  companyId: string | null
  excludeUserId?: string | null
  initialMode?: Mode
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submitUser: [payload: { userId: string; nota: string | null }]
  submitSetor: [payload: { setorId: string; nota: string | null }]
}>()

const supabase = useSupabaseClient<Database>()

const mode = ref<Mode>(props.initialMode ?? 'user')
const searchTerm = ref('')
const selectedUserId = ref<string | null>(null)
const selectedSetorId = ref<string | null>(null)
const nota = ref('')
const submitting = ref(false)
const errMsg = ref('')

watch(
  () => props.open,
  (open) => {
    if (open) {
      mode.value = props.initialMode ?? 'user'
      searchTerm.value = ''
      selectedUserId.value = null
      selectedSetorId.value = null
      nota.value = ''
      errMsg.value = ''
    }
  },
)

watch(mode, () => {
  searchTerm.value = ''
  selectedUserId.value = null
  selectedSetorId.value = null
  errMsg.value = ''
})

const { data: setores } = useAsyncData<Setor[]>(
  'transfer-setores',
  async () => {
    if (!props.companyId) return []
    const { data, error } = await supabase
      .from('setores' as never)
      .select('id, nome, cor, descricao')
      .eq('company_id', props.companyId)
      .order('nome', { ascending: true })
    if (error) throw error
    return (data ?? []) as unknown as Setor[]
  },
  { watch: [() => props.companyId], default: () => [] },
)

const setorById = computed(() => {
  const m = new Map<string, Setor>()
  for (const s of setores.value ?? []) m.set(s.id, s)
  return m
})

const { data: users, pending: usersPending } = useAsyncData<AppUser[]>(
  'transfer-users',
  async () => {
    if (!props.companyId) return []
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('companie_id', props.companyId)
      .neq('funcao_user', 'VIEWER')
      .eq('status', 'Ativo')
      .order('nome', { ascending: true, nullsFirst: false })
    if (error) throw error
    return (data ?? []) as AppUser[]
  },
  { watch: [() => props.companyId], default: () => [] },
)

const filteredUsers = computed(() => {
  const q = searchTerm.value.trim().toLowerCase()
  return (users.value ?? []).filter((u) => {
    if (props.excludeUserId && u.id === props.excludeUserId) return false
    if (!q) return true
    const setorNome = u.setor_id
      ? setorById.value.get(u.setor_id)?.nome ?? ''
      : ''
    const hay = [u.nome, u.email, setorNome]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
})

const filteredSetores = computed(() => {
  const q = searchTerm.value.trim().toLowerCase()
  return (setores.value ?? []).filter((s) => {
    if (!q) return true
    const hay = [s.nome, s.descricao].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q)
  })
})

async function submit() {
  errMsg.value = ''
  if (mode.value === 'user') {
    if (!selectedUserId.value) {
      errMsg.value = 'Escolha um atendente.'
      return
    }
    submitting.value = true
    try {
      await Promise.resolve(
        emit('submitUser', {
          userId: selectedUserId.value,
          nota: nota.value.trim() || null,
        }),
      )
      emit('update:open', false)
    } catch (err) {
      errMsg.value = err instanceof Error ? err.message : 'Falha ao transferir.'
    } finally {
      submitting.value = false
    }
  } else {
    if (!selectedSetorId.value) {
      errMsg.value = 'Escolha um setor.'
      return
    }
    submitting.value = true
    try {
      await Promise.resolve(
        emit('submitSetor', {
          setorId: selectedSetorId.value,
          nota: nota.value.trim() || null,
        }),
      )
      emit('update:open', false)
    } catch (err) {
      errMsg.value = err instanceof Error ? err.message : 'Falha ao transferir.'
    } finally {
      submitting.value = false
    }
  }
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Transferir conversa</DialogTitle>
        <DialogDescription>
          {{
            mode === 'user'
              ? 'Escolha um atendente. Ele recebe uma notificação e a conversa passa pra ele.'
              : 'Escolha um setor. Todos do setor recebem notificação e o primeiro a assumir fica com a conversa.'
          }}
        </DialogDescription>
      </DialogHeader>

      <div class="mb-2 flex gap-1 text-xs">
        <button
          type="button"
          class="flex-1 rounded px-3 py-1.5 font-medium transition-colors"
          :class="mode === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'"
          @click="mode = 'user'"
        >
          <UserIcon class="mr-1 inline h-3.5 w-3.5" />
          Atendente
        </button>
        <button
          type="button"
          class="flex-1 rounded px-3 py-1.5 font-medium transition-colors"
          :class="mode === 'setor' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'"
          @click="mode = 'setor'"
        >
          <Tag class="mr-1 inline h-3.5 w-3.5" />
          Setor
        </button>
      </div>

      <div class="space-y-3">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="searchTerm"
            :placeholder="mode === 'user' ? 'Buscar atendente' : 'Buscar setor'"
            class="pl-9"
          />
        </div>

        <div class="max-h-64 overflow-y-auto rounded-md border">
          <template v-if="mode === 'user'">
            <p
              v-if="usersPending"
              class="px-3 py-4 text-center text-sm text-muted-foreground"
            >
              Carregando...
            </p>
            <p
              v-else-if="filteredUsers.length === 0"
              class="px-3 py-4 text-center text-sm text-muted-foreground"
            >
              Nenhum atendente disponível.
            </p>
            <ul v-else>
              <li v-for="u in filteredUsers" :key="u.id">
                <button
                  type="button"
                  class="flex w-full items-center gap-3 border-b px-3 py-2 text-left transition-colors hover:bg-muted/50"
                  :class="selectedUserId === u.id ? 'bg-primary/10' : ''"
                  @click="selectedUserId = u.id"
                >
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <UserIcon class="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium">{{ u.nome || u.email }}</p>
                    <p class="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <span
                        v-if="u.setor_id"
                        class="inline-block h-2 w-2 rounded-full"
                        :style="{ backgroundColor: setorById.get(u.setor_id)?.cor || '#94a3b8' }"
                      />
                      {{ u.setor_id ? setorById.get(u.setor_id)?.nome ?? 'Sem setor' : 'Sem setor' }}
                    </p>
                  </div>
                </button>
              </li>
            </ul>
          </template>

          <template v-else>
            <p
              v-if="filteredSetores.length === 0"
              class="px-3 py-4 text-center text-sm text-muted-foreground"
            >
              Nenhum setor cadastrado.
            </p>
            <ul v-else>
              <li v-for="s in filteredSetores" :key="s.id">
                <button
                  type="button"
                  class="flex w-full items-center gap-3 border-b px-3 py-2 text-left transition-colors hover:bg-muted/50"
                  :class="selectedSetorId === s.id ? 'bg-primary/10' : ''"
                  @click="selectedSetorId = s.id"
                >
                  <span
                    class="inline-block h-4 w-4 shrink-0 rounded-full border"
                    :style="{ backgroundColor: s.cor || '#94a3b8' }"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium">{{ s.nome }}</p>
                    <p
                      v-if="s.descricao"
                      class="truncate text-xs text-muted-foreground"
                    >
                      {{ s.descricao }}
                    </p>
                  </div>
                </button>
              </li>
            </ul>
          </template>
        </div>

        <div class="space-y-1.5">
          <Label for="transfer-nota">Nota (opcional)</Label>
          <Input
            id="transfer-nota"
            v-model="nota"
            placeholder="Ex: cliente quer falar sobre boleto"
          />
        </div>

        <p
          v-if="errMsg"
          class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {{ errMsg }}
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" @click="emit('update:open', false)">Cancelar</Button>
        <Button
          :disabled="submitting || (mode === 'user' ? !selectedUserId : !selectedSetorId)"
          @click="submit"
        >
          <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
          Transferir
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
