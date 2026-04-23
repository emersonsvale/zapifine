<script setup lang="ts">
import { ref, watch } from 'vue'
import { Loader2, Plus, X } from 'lucide-vue-next'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: { name: string; options: string[] }]
}>()

const question = ref('')
const options = ref<string[]>(['', ''])
const sending = ref(false)
const err = ref('')

watch(
  () => props.open,
  (o) => {
    if (o) {
      question.value = ''
      options.value = ['', '']
      err.value = ''
      sending.value = false
    }
  },
)

function addOption() {
  if (options.value.length < 12) options.value.push('')
}
function removeOption(idx: number) {
  if (options.value.length <= 2) return
  options.value.splice(idx, 1)
}

async function onSubmit() {
  err.value = ''
  const q = question.value.trim()
  const opts = options.value.map((s) => s.trim()).filter(Boolean)
  if (!q) {
    err.value = 'Pergunta obrigatória.'
    return
  }
  if (opts.length < 2) {
    err.value = 'Mínimo 2 opções.'
    return
  }
  sending.value = true
  try {
    await Promise.resolve(emit('submit', { name: q, options: opts }))
    emit('update:open', false)
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Falha ao enviar.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Enviar enquete</DialogTitle>
        <DialogDescription>Pergunta e no mínimo 2 opções.</DialogDescription>
      </DialogHeader>

      <div class="space-y-3">
        <div class="space-y-1.5">
          <Label>Pergunta</Label>
          <Input v-model="question" placeholder="Qual sua cor favorita?" />
        </div>

        <div class="space-y-2">
          <Label>Opções</Label>
          <div
            v-for="(_, idx) in options"
            :key="idx"
            class="flex items-center gap-2"
          >
            <Input v-model="options[idx]" :placeholder="`Opção ${idx + 1}`" />
            <Button
              variant="ghost"
              size="icon"
              :disabled="options.length <= 2"
              @click="removeOption(idx)"
            >
              <X class="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            :disabled="options.length >= 12"
            @click="addOption"
          >
            <Plus class="h-4 w-4" />
            Adicionar opção
          </Button>
        </div>

        <p v-if="err" class="text-sm text-destructive">{{ err }}</p>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">Cancelar</Button>
        <Button :disabled="sending" @click="onSubmit">
          <Loader2 v-if="sending" class="h-4 w-4 animate-spin" />
          Enviar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
