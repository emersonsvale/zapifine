<script setup lang="ts">
import { ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{ funilId: number | null; funilNome: string | null }>()

const { renameFunil } = useFunis()

const nome = ref('')
const saving = ref(false)
const errorMsg = ref('')

watch(open, (v) => {
  if (!v) return
  nome.value = props.funilNome ?? ''
  errorMsg.value = ''
})

async function submit() {
  errorMsg.value = ''
  if (!props.funilId) return
  if (!nome.value.trim()) {
    errorMsg.value = 'Informe o nome do funil.'
    return
  }
  saving.value = true
  try {
    await renameFunil(props.funilId, nome.value)
    open.value = false
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Falha ao renomear funil.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Renomear funil</DialogTitle>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="submit">
        <div class="space-y-1.5">
          <Label for="funil-rename">Nome do funil</Label>
          <Input
            id="funil-rename"
            v-model="nome"
            placeholder="Nome"
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
            Salvar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
