<script setup lang="ts">
import { ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'

const open = defineModel<boolean>('open', { default: false })

const { createFunil } = useFunis()

const nome = ref('')
const saving = ref(false)
const errorMsg = ref('')

watch(open, (v) => {
  if (!v) return
  nome.value = ''
  errorMsg.value = ''
})

async function submit() {
  errorMsg.value = ''
  if (!nome.value.trim()) {
    errorMsg.value = 'Informe o nome do funil.'
    return
  }
  saving.value = true
  try {
    await createFunil(nome.value)
    open.value = false
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Falha ao criar funil.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Novo funil</DialogTitle>
        <DialogDescription>
          O funil nasce com as 6 colunas fixas: Novo, Em Atendimento, Agendado,
          Concluído, Perdido e Arquivado.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="submit">
        <div class="space-y-1.5">
          <Label for="funil-nome">Nome do funil</Label>
          <Input
            id="funil-nome"
            v-model="nome"
            placeholder="Ex: Vendas B2B"
            autocomplete="off"
            autofocus
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
            Criar funil
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
