<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Setor = {
  id: string
  company_id: string
  nome: string
  descricao: string | null
  cor: string | null
  created_at: string
  updated_at: string
}

const supabase = useSupabaseClient<Database>()
const { data: currentUser } = useCurrentUser()
const { toast, confirm } = useAlerts()

const companyId = computed(() => currentUser.value?.companie_id ?? null)
const canManage = computed(() => currentUser.value?.funcao_user === 'OWNER')

const { data: setores, pending, refresh } = useAsyncData<Setor[]>(
  'setores-list',
  async () => {
    if (!companyId.value) return []
    const { data, error } = await supabase
      .from('setores' as never)
      .select('*')
      .eq('company_id', companyId.value)
      .order('nome', { ascending: true })
    if (error) throw error
    return (data ?? []) as unknown as Setor[]
  },
  { watch: [companyId], default: () => [] },
)

const dialogOpen = ref(false)
const editing = ref<Setor | null>(null)
const formNome = ref('')
const formDescricao = ref('')
const formCor = ref('#0ea5e9')
const saving = ref(false)
const errMsg = ref('')

function openCreate() {
  editing.value = null
  formNome.value = ''
  formDescricao.value = ''
  formCor.value = '#0ea5e9'
  errMsg.value = ''
  dialogOpen.value = true
}

function openEdit(s: Setor) {
  editing.value = s
  formNome.value = s.nome
  formDescricao.value = s.descricao ?? ''
  formCor.value = s.cor ?? '#0ea5e9'
  errMsg.value = ''
  dialogOpen.value = true
}

watch(dialogOpen, (open) => {
  if (!open) errMsg.value = ''
})

async function saveSetor() {
  if (!companyId.value) return
  const nome = formNome.value.trim()
  if (!nome) {
    errMsg.value = 'Nome obrigatório.'
    return
  }
  saving.value = true
  errMsg.value = ''
  try {
    if (editing.value) {
      const { error } = await supabase
        .from('setores' as never)
        .update({
          nome,
          descricao: formDescricao.value.trim() || null,
          cor: formCor.value || null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', editing.value.id)
      if (error) throw error
      toast.success('Setor atualizado.')
    } else {
      const { error } = await supabase
        .from('setores' as never)
        .insert({
          company_id: companyId.value,
          nome,
          descricao: formDescricao.value.trim() || null,
          cor: formCor.value || null,
        } as never)
      if (error) throw error
      toast.success('Setor criado.')
    }
    dialogOpen.value = false
    await refresh()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao salvar.'
    errMsg.value = msg.includes('setores_company_nome_uq')
      ? 'Já existe setor com esse nome.'
      : msg
  } finally {
    saving.value = false
  }
}

async function removeSetor(s: Setor) {
  const ok = await confirm({
    title: 'Excluir setor',
    description: `O setor "${s.nome}" será removido. Usuários e conversas vinculados ficarão sem setor.`,
    confirmLabel: 'Excluir',
    variant: 'danger',
  })
  if (!ok) return
  try {
    const { error } = await supabase
      .from('setores' as never)
      .delete()
      .eq('id', s.id)
    if (error) throw error
    toast.success('Setor removido.')
    await refresh()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao excluir.')
  }
}
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row items-start justify-between gap-4 space-y-0">
      <div>
        <CardTitle class="text-2xl">Setores</CardTitle>
        <CardDescription>
          Agrupe atendentes por área (vendas, suporte, etc) e direcione conversas entre setores.
        </CardDescription>
      </div>
      <Button v-if="canManage" @click="openCreate">
        <Plus class="h-4 w-4" />
        Novo setor
      </Button>
    </CardHeader>
    <CardContent>
      <div class="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cor</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead class="w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="pending">
              <TableCell colspan="4" class="h-20 text-center text-muted-foreground">
                Carregando...
              </TableCell>
            </TableRow>
            <TableRow v-else-if="!setores || setores.length === 0">
              <TableCell colspan="4" class="h-20 text-center text-muted-foreground">
                Nenhum setor cadastrado.
              </TableCell>
            </TableRow>
            <TableRow v-for="s in setores ?? []" :key="s.id">
              <TableCell>
                <span
                  class="inline-block h-4 w-4 rounded-full border"
                  :style="{ backgroundColor: s.cor || '#94a3b8' }"
                />
              </TableCell>
              <TableCell class="font-medium">{{ s.nome }}</TableCell>
              <TableCell class="text-muted-foreground">{{ s.descricao || '—' }}</TableCell>
              <TableCell>
                <div v-if="canManage" class="flex gap-1">
                  <Button variant="ghost" size="icon" title="Editar" @click="openEdit(s)">
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Excluir"
                    class="text-destructive hover:text-destructive"
                    @click="removeSetor(s)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
                <span v-else class="text-muted-foreground">—</span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </CardContent>

    <Dialog v-model:open="dialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ editing ? 'Editar setor' : 'Novo setor' }}</DialogTitle>
          <DialogDescription>
            Defina nome e cor para identificar o setor no chat.
          </DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="saveSetor">
          <div class="space-y-1.5">
            <Label for="setor-nome">Nome</Label>
            <Input id="setor-nome" v-model="formNome" placeholder="Vendas" />
          </div>
          <div class="space-y-1.5">
            <Label for="setor-desc">Descrição</Label>
            <Input id="setor-desc" v-model="formDescricao" placeholder="(opcional)" />
          </div>
          <div class="space-y-1.5">
            <Label for="setor-cor">Cor</Label>
            <div class="flex items-center gap-2">
              <input
                id="setor-cor"
                v-model="formCor"
                type="color"
                class="h-10 w-16 cursor-pointer rounded border"
              />
              <Input v-model="formCor" class="flex-1" />
            </div>
          </div>
          <p
            v-if="errMsg"
            class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {{ errMsg }}
          </p>
          <DialogFooter>
            <Button variant="outline" type="button" @click="dialogOpen = false">
              Cancelar
            </Button>
            <Button type="submit" :disabled="saving">
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </Card>
</template>
