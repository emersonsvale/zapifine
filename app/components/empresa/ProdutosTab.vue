<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Plus, Loader2, Trash2, ImageIcon } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Product = Database['public']['Tables']['produtos']['Row']

const { products, pending, createProduct, updateProduct, deleteProduct } =
  useProducts()
const { toast, confirm } = useAlerts()

const addOpen = ref(false)
const form = reactive({
  nome: '',
  descricao: '',
  preco: '',
  exibir_preco: false,
})
const saving = ref(false)
const errorMsg = ref('')

function resetForm() {
  form.nome = ''
  form.descricao = ''
  form.preco = ''
  form.exibir_preco = false
  errorMsg.value = ''
}

async function submitAdd() {
  errorMsg.value = ''
  if (!form.nome.trim()) {
    errorMsg.value = 'Nome do produto é obrigatório.'
    return
  }
  saving.value = true
  try {
    await createProduct({
      nome: form.nome,
      descricao: form.descricao,
      preco: form.preco ? Number(form.preco.replace(',', '.')) : null,
      exibir_preco: form.exibir_preco,
    })
    resetForm()
    addOpen.value = false
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : 'Falha ao adicionar produto.'
  } finally {
    saving.value = false
  }
}

async function handleToggle(p: Product, field: 'ativo' | 'exibir_preco') {
  try {
    await updateProduct(p.id, { [field]: !p[field] })
  } catch (err) {
    console.error(err)
  }
}

async function handleDelete(id: number) {
  const ok = await confirm({
    title: 'Remover produto',
    description: 'Esta ação não pode ser desfeita.',
    confirmLabel: 'Remover',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await deleteProduct(id)
    toast.success('Produto removido.')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Falha ao remover.')
  }
}

const priceFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})
function formatPrice(v: number | null) {
  return v != null ? priceFmt.format(v) : '—'
}
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row items-start justify-between gap-4 space-y-0">
      <div>
        <CardTitle class="text-2xl">Produtos/Serviços</CardTitle>
        <CardDescription>
          Adicione seus produtos ou serviços (a IA irá sugerir estes
          produtos/serviços aos seus leads).
        </CardDescription>
      </div>
      <Dialog v-model:open="addOpen">
        <DialogTrigger as-child>
          <Button>
            <Plus class="h-4 w-4" />
            Adicionar novo produto/Serviço
          </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo produto</DialogTitle>
            <DialogDescription>
              Cadastre um item do seu catálogo.
            </DialogDescription>
          </DialogHeader>

          <form class="space-y-4" @submit.prevent="submitAdd">
            <div class="space-y-1.5">
              <Label for="prod-nome">Nome</Label>
              <Input
                id="prod-nome"
                v-model="form.nome"
                placeholder="Ex: Consultoria Premium"
              />
            </div>
            <div class="space-y-1.5">
              <Label for="prod-desc">Descrição</Label>
              <textarea
                id="prod-desc"
                v-model="form.descricao"
                rows="3"
                class="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <div class="grid gap-3 md:grid-cols-2">
              <div class="space-y-1.5">
                <Label for="prod-preco">Preço (R$)</Label>
                <Input
                  id="prod-preco"
                  v-model="form.preco"
                  inputmode="decimal"
                  placeholder="0,00"
                />
              </div>
              <div class="space-y-1.5">
                <Label>Mostrar preço</Label>
                <label class="flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm">
                  <input
                    v-model="form.exibir_preco"
                    type="checkbox"
                    class="h-4 w-4 rounded accent-primary"
                  />
                  Exibir para leads
                </label>
              </div>
            </div>

            <p
              v-if="errorMsg"
              class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {{ errorMsg }}
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" @click="addOpen = false">
                Cancelar
              </Button>
              <Button type="submit" :disabled="saving">
                <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
                Adicionar
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
              <TableHead>Produto</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Mostrar preço</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead class="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="pending">
              <TableCell colspan="5" class="h-20 text-center text-muted-foreground">
                Carregando...
              </TableCell>
            </TableRow>
            <TableRow v-else-if="!products || products.length === 0">
              <TableCell colspan="5" class="h-20 text-center text-muted-foreground">
                Nenhum produto cadastrado.
              </TableCell>
            </TableRow>
            <TableRow v-for="p in products ?? []" :key="p.id">
              <TableCell>
                <div class="flex items-start gap-3">
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted"
                  >
                    <img
                      v-if="p.imagem_principal"
                      :src="p.imagem_principal"
                      alt=""
                      class="h-full w-full object-cover"
                    />
                    <ImageIcon v-else class="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium">
                      {{ p.nome ?? '—' }}
                    </p>
                    <p
                      v-if="p.descricao"
                      class="mt-0.5 line-clamp-2 max-w-md text-xs text-muted-foreground"
                    >
                      {{ p.descricao }}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{{ formatPrice(p.preco) }}</TableCell>
              <TableCell>
                <label class="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    class="peer sr-only"
                    :checked="!!p.exibir_preco"
                    @change="handleToggle(p, 'exibir_preco')"
                  />
                  <span
                    class="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-primary"
                  />
                  <span
                    class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-4"
                  />
                </label>
              </TableCell>
              <TableCell>
                <label class="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    class="peer sr-only"
                    :checked="!!p.ativo"
                    @change="handleToggle(p, 'ativo')"
                  />
                  <span
                    class="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-primary"
                  />
                  <span
                    class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-4"
                  />
                </label>
              </TableCell>
              <TableCell class="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  class="text-destructive hover:text-destructive"
                  title="Remover"
                  @click="handleDelete(p.id)"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
</template>
