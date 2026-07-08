<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Loader2, AlertTriangle } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Column = Database['public']['Tables']['ff_colunas_funil']['Row']

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{ coluna: Column | null }>()

const { deleteColuna, leads } = useLeads()

const saving = ref(false)
const errorMsg = ref('')

const leadsCount = computed(() => {
  if (!props.coluna) return 0
  return (leads.value ?? []).filter((l) => l.coluna_id === props.coluna!.id).length
})

watch(open, (v) => {
  if (!v) return
  errorMsg.value = ''
})

async function submit() {
  if (!props.coluna) return
  errorMsg.value = ''
  saving.value = true
  try {
    await deleteColuna(props.coluna.id)
    open.value = false
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Falha ao excluir coluna.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <AlertTriangle class="h-5 w-5 text-destructive" />
          Excluir coluna
        </DialogTitle>
        <DialogDescription>
          A coluna <span class="font-medium">"{{ coluna?.nome_coluna }}"</span>
          será excluída.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-3">
        <p
          v-if="leadsCount > 0"
          class="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200"
        >
          {{ leadsCount }} lead(s) nesta coluna serão movidos automaticamente para
          "Novo".
        </p>

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
          <Button variant="destructive" :disabled="saving" @click="submit">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            Excluir coluna
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>
