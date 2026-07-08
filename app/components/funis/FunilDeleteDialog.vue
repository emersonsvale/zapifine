<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Loader2, AlertTriangle } from 'lucide-vue-next'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{ funilId: number | null; funilNome: string | null }>()

const { funis, deleteFunil, defaultFunilId } = useFunis()

const targetId = ref<number | null>(null)
const saving = ref(false)
const errorMsg = ref('')

const options = computed(() =>
  (funis.value ?? []).filter((f) => f.id !== props.funilId),
)

watch(open, (v) => {
  if (!v) return
  errorMsg.value = ''
  // Pré-seleciona o padrão como destino, se disponível e diferente do funil excluído
  const preferred = defaultFunilId.value
  if (preferred && preferred !== props.funilId) {
    targetId.value = preferred
  } else {
    targetId.value = options.value[0]?.id ?? null
  }
})

async function submit() {
  errorMsg.value = ''
  if (!props.funilId) return
  if (!targetId.value) {
    errorMsg.value = 'Selecione o funil de destino para os leads.'
    return
  }
  saving.value = true
  try {
    await deleteFunil(props.funilId, targetId.value)
    open.value = false
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Falha ao excluir funil.'
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
          Excluir funil
        </DialogTitle>
        <DialogDescription>
          O funil <span class="font-medium">"{{ funilNome }}"</span> será excluído.
          Escolha para qual funil os leads existentes serão movidos.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="submit">
        <div class="space-y-1.5">
          <Label>Mover leads para</Label>
          <Select
            v-if="options.length"
            :model-value="targetId != null ? String(targetId) : undefined"
            @update:model-value="(v: unknown) => (targetId = v ? Number(v) : null)"
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o funil de destino" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="f in options"
                :key="f.id"
                :value="String(f.id)"
              >
                {{ f.nome_funil ?? 'Sem nome' }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-else class="text-sm text-muted-foreground">
            Nenhum outro funil disponível como destino. Crie outro funil antes de
            excluir este.
          </p>
        </div>

        <p class="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
          As colunas fixas (Novo, Em Atendimento, Agendado, Concluído, Perdido,
          Arquivado) serão mapeadas para as colunas equivalentes do funil destino.
          Colunas personalizadas cairão em "Novo".
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
          <Button
            type="submit"
            variant="destructive"
            :disabled="saving || !options.length"
          >
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            Excluir funil
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
