<script setup lang="ts">
import { computed, ref } from 'vue'
import { UserPlus, Loader2, Pencil } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type AppUser = Database['public']['Tables']['users']['Row'] & {
  setor_id?: string | null
}

type Setor = {
  id: string
  nome: string
  cor: string | null
}

const supabase = useSupabaseClient<Database>()
const { data: currentUser } = useCurrentUser()
const { toast } = useAlerts()

const companyId = computed(() => currentUser.value?.companie_id ?? null)
const canInvite = computed(() => currentUser.value?.funcao_user === 'OWNER')

const {
  data: teamUsers,
  pending,
  refresh,
} = useAsyncData<AppUser[]>(
  'team-users',
  async () => {
    if (!companyId.value) return []
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('companie_id', companyId.value)
      .order('nome', { ascending: true, nullsFirst: false })
    if (error) throw error
    return (data ?? []) as AppUser[]
  },
  { watch: [companyId], default: () => [] },
)

const { data: setores } = useAsyncData<Setor[]>(
  'team-setores',
  async () => {
    if (!companyId.value) return []
    const { data, error } = await supabase
      .from('setores' as never)
      .select('id, nome, cor')
      .eq('company_id', companyId.value)
      .order('nome', { ascending: true })
    if (error) throw error
    return (data ?? []) as unknown as Setor[]
  },
  { watch: [companyId], default: () => [] },
)

const setorById = computed(() => {
  const m = new Map<string, Setor>()
  for (const s of setores.value ?? []) m.set(s.id, s)
  return m
})

function setorLabel(id: string | null | undefined) {
  if (!id) return '—'
  return setorById.value.get(id)?.nome ?? '—'
}

function setorColor(id: string | null | undefined) {
  if (!id) return '#94a3b8'
  return setorById.value.get(id)?.cor || '#94a3b8'
}

function roleLabel(v: AppUser['funcao_user']) {
  switch (v) {
    case 'OWNER':
      return 'Admin'
    case 'EMPLOYEE':
      return 'Usuário'
    case 'VIEWER':
      return 'Visualizador'
    default:
      return '—'
  }
}

function statusBadgeVariant(v: AppUser['status']) {
  switch (v) {
    case 'Ativo':
      return 'default' as const
    case 'Bloqueado':
      return 'destructive' as const
    case 'Desativado':
      return 'secondary' as const
    default:
      return 'outline' as const
  }
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
function formatDate(v: string | null) {
  return v ? dateFmt.format(new Date(v)) : '—'
}

// Invite dialog
const inviteOpen = ref(false)
const inviteEmail = ref('')
const inviteRole = ref<'EMPLOYEE' | 'VIEWER'>('EMPLOYEE')
const inviteSetorId = ref<string | null>(null)
const inviting = ref(false)
const inviteMsg = ref<{ kind: 'ok' | 'err'; text: string } | null>(null)

async function sendInvite() {
  inviteMsg.value = null
  if (!inviteEmail.value.trim()) {
    inviteMsg.value = { kind: 'err', text: 'Informe um e-mail.' }
    return
  }
  inviting.value = true
  try {
    const res = await $fetch<{ ok: boolean; message?: string }>(
      '/api/team/invite',
      {
        method: 'POST',
        body: {
          email: inviteEmail.value.trim(),
          role: inviteRole.value,
          companieId: companyId.value,
          setorId: inviteSetorId.value,
        },
      },
    )
    if (res.ok) {
      inviteMsg.value = { kind: 'ok', text: res.message ?? 'Convite enviado.' }
      inviteEmail.value = ''
      inviteSetorId.value = null
      await refresh()
    } else {
      inviteMsg.value = {
        kind: 'err',
        text: res.message ?? 'Falha ao enviar convite.',
      }
    }
  } catch (err) {
    const e = err as { data?: { message?: string }; message?: string }
    inviteMsg.value = {
      kind: 'err',
      text: e.data?.message ?? e.message ?? 'Falha ao enviar convite.',
    }
  } finally {
    inviting.value = false
  }
}

// Edit setor dialog
const editOpen = ref(false)
const editingUser = ref<AppUser | null>(null)
const editSetorId = ref<string | null>(null)
const savingEdit = ref(false)

function openEdit(u: AppUser) {
  editingUser.value = u
  editSetorId.value = u.setor_id ?? null
  editOpen.value = true
}

async function saveUserSetor() {
  if (!editingUser.value) return
  savingEdit.value = true
  try {
    const { error } = await supabase
      .from('users')
      .update({ setor_id: editSetorId.value } as never)
      .eq('id', editingUser.value.id)
    if (error) throw error
    toast.success('Setor atualizado.')
    editOpen.value = false
    await refresh()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao salvar.')
  } finally {
    savingEdit.value = false
  }
}
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row items-start justify-between gap-4 space-y-0">
      <div>
        <CardTitle class="text-2xl">Gestão de Usuários</CardTitle>
        <CardDescription>
          Gerencie os membros da sua equipe, suas permissões e setores.
        </CardDescription>
      </div>

      <Dialog v-if="canInvite" v-model:open="inviteOpen">
        <DialogTrigger as-child>
          <Button>
            <UserPlus class="h-4 w-4" />
            Convidar Usuário
          </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar usuário</DialogTitle>
            <DialogDescription>
              Enviaremos um e-mail com um link para a pessoa definir a senha.
            </DialogDescription>
          </DialogHeader>

          <form class="space-y-4" @submit.prevent="sendInvite">
            <div class="space-y-1.5">
              <Label for="invite-email">E-mail</Label>
              <Input
                id="invite-email"
                v-model="inviteEmail"
                type="email"
                placeholder="pessoa@empresa.com"
                autocomplete="email"
              />
            </div>
            <div class="space-y-1.5">
              <Label for="invite-role">Função</Label>
              <Select v-model="inviteRole">
                <SelectTrigger id="invite-role" class="w-full">
                  <SelectValue placeholder="Escolha a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Usuário</SelectItem>
                  <SelectItem value="VIEWER">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Label for="invite-setor">Setor</Label>
              <Select v-model="inviteSetorId">
                <SelectTrigger id="invite-setor" class="w-full">
                  <SelectValue placeholder="Sem setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="null">Sem setor</SelectItem>
                  <SelectItem
                    v-for="s in setores ?? []"
                    :key="s.id"
                    :value="s.id"
                  >
                    {{ s.nome }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p
              v-if="inviteMsg"
              class="rounded-md border px-3 py-2 text-sm"
              :class="
                inviteMsg.kind === 'ok'
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              "
            >
              {{ inviteMsg.text }}
            </p>

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                @click="inviteOpen = false"
              >
                Cancelar
              </Button>
              <Button type="submit" :disabled="inviting">
                <Loader2 v-if="inviting" class="h-4 w-4 animate-spin" />
                Enviar convite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </CardHeader>

    <CardContent>
      <div class="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último Acesso</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="pending">
              <TableCell colspan="7" class="h-20 text-center text-muted-foreground">
                Carregando...
              </TableCell>
            </TableRow>
            <TableRow v-else-if="!teamUsers || teamUsers.length === 0">
              <TableCell colspan="7" class="h-20 text-center text-muted-foreground">
                Nenhum usuário na equipe.
              </TableCell>
            </TableRow>
            <TableRow v-for="u in teamUsers ?? []" :key="u.id">
              <TableCell class="font-medium">{{ u.nome || '—' }}</TableCell>
              <TableCell class="text-muted-foreground">{{ u.email }}</TableCell>
              <TableCell>{{ roleLabel(u.funcao_user) }}</TableCell>
              <TableCell>
                <span class="inline-flex items-center gap-2">
                  <span
                    class="inline-block h-3 w-3 rounded-full border"
                    :style="{ backgroundColor: setorColor(u.setor_id) }"
                  />
                  {{ setorLabel(u.setor_id) }}
                </span>
              </TableCell>
              <TableCell>
                <Badge :variant="statusBadgeVariant(u.status)">
                  {{ u.status ?? '—' }}
                </Badge>
              </TableCell>
              <TableCell class="text-muted-foreground">
                {{ formatDate(u.last_login) }}
              </TableCell>
              <TableCell>
                <Button
                  v-if="canInvite && u.funcao_user !== 'OWNER'"
                  variant="ghost"
                  size="icon"
                  title="Editar setor"
                  @click="openEdit(u)"
                >
                  <Pencil class="h-4 w-4" />
                </Button>
                <span v-else class="text-muted-foreground">—</span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </CardContent>

    <Dialog v-model:open="editOpen">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar setor</DialogTitle>
          <DialogDescription>
            Atribua um setor a {{ editingUser?.nome || editingUser?.email }}.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-1.5">
          <Label>Setor</Label>
          <Select v-model="editSetorId">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Sem setor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="null">Sem setor</SelectItem>
              <SelectItem v-for="s in setores ?? []" :key="s.id" :value="s.id">
                {{ s.nome }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" @click="editOpen = false">Cancelar</Button>
          <Button :disabled="savingEdit" @click="saveUserSetor">
            <Loader2 v-if="savingEdit" class="h-4 w-4 animate-spin" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </Card>
</template>
