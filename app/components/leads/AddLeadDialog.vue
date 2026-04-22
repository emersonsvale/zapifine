<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{ colunaId: number; colunaLabel?: string }>()

const { createLead } = useLeads()

const form = reactive({
  nome: '',
  numero: '',
  email: '',
  observacao: '',
})
const saving = ref(false)
const errorMsg = ref('')

watch(open, (v) => {
  if (!v) return
  form.nome = ''
  form.numero = ''
  form.email = ''
  form.observacao = ''
  errorMsg.value = ''
})

async function submit() {
  errorMsg.value = ''
  if (!form.nome.trim() && !form.numero.trim()) {
    errorMsg.value = 'Informe o nome ou o número do WhatsApp.'
    return
  }
  saving.value = true
  try {
    await createLead({
      nome: form.nome,
      numero: form.numero,
      email: form.email || undefined,
      observacao: form.observacao || undefined,
      colunaId: props.colunaId,
    })
    open.value = false
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : 'Falha ao criar lead.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Novo lead</DialogTitle>
        <DialogDescription>
          {{ colunaLabel ? `Adicionar em "${colunaLabel}"` : 'Adicionar ao funil' }}
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="submit">
        <div class="space-y-1.5">
          <Label for="lead-nome">Nome</Label>
          <Input id="lead-nome" v-model="form.nome" placeholder="Nome do lead" />
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="lead-numero">WhatsApp</Label>
            <Input
              id="lead-numero"
              v-model="form.numero"
              placeholder="55119..."
              inputmode="tel"
              autocomplete="off"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="lead-email">E-mail</Label>
            <Input
              id="lead-email"
              v-model="form.email"
              type="email"
              placeholder="opcional"
              autocomplete="off"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <Label for="lead-obs">Observação</Label>
          <textarea
            id="lead-obs"
            v-model="form.observacao"
            rows="3"
            class="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            placeholder="Contexto do contato"
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
            Criar lead
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
