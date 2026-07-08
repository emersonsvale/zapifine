<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Column = Database['public']['Tables']['ff_colunas_funil']['Row']

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  mode: 'create' | 'edit'
  coluna?: Column | null
}>()

const { createColuna, updateColuna } = useLeads()

const form = reactive({
  nome: '',
  descricao: '',
})
const saving = ref(false)
const errorMsg = ref('')

watch(open, (v) => {
  if (!v) return
  errorMsg.value = ''
  if (props.mode === 'edit' && props.coluna) {
    form.nome = props.coluna.nome_coluna ?? ''
    form.descricao = props.coluna.descricao ?? ''
  } else {
    form.nome = ''
    form.descricao = ''
  }
})

async function submit() {
  errorMsg.value = ''
  if (!form.nome.trim()) {
    errorMsg.value = 'Informe o nome da coluna.'
    return
  }
  saving.value = true
  try {
    if (props.mode === 'edit' && props.coluna) {
      await updateColuna(props.coluna.id, {
        nome: form.nome,
        descricao: form.descricao,
      })
    } else {
      await createColuna({ nome: form.nome, descricao: form.descricao })
    }
    open.value = false
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Falha ao salvar coluna.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {{ mode === 'edit' ? 'Editar coluna' : 'Nova coluna' }}
        </DialogTitle>
        <DialogDescription v-if="mode === 'create'">
          A coluna será adicionada ao funil ativo.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="submit">
        <div class="space-y-1.5">
          <Label for="col-nome">Nome</Label>
          <Input
            id="col-nome"
            v-model="form.nome"
            placeholder="Ex: Proposta enviada"
            autocomplete="off"
            autofocus
          />
        </div>
        <div class="space-y-1.5">
          <Label for="col-desc">Descrição (opcional)</Label>
          <Input
            id="col-desc"
            v-model="form.descricao"
            placeholder="Contexto do estágio"
            autocomplete="off"
          />
        </div>

        <p
          v-if="errorMsg"
          class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {{ errorMsg }}
        </p>

        <DialogFooter>
          <Button variant="outline" type="button" @click="open = false">
            Cancelar
          </Button>
          <Button type="submit" :disabled="saving">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            {{ mode === 'edit' ? 'Salvar' : 'Criar coluna' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
