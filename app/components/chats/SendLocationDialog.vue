<script setup lang="ts">
import { ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: { latitude: number; longitude: number; name?: string }]
}>()

const latitude = ref('')
const longitude = ref('')
const name = ref('')
const sending = ref(false)
const err = ref('')

watch(
  () => props.open,
  (o) => {
    if (o) {
      latitude.value = ''
      longitude.value = ''
      name.value = ''
      err.value = ''
      sending.value = false
    }
  },
)

async function onSubmit() {
  err.value = ''
  const lat = Number(latitude.value.replace(',', '.'))
  const lng = Number(longitude.value.replace(',', '.'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    err.value = 'Latitude/longitude inválidas.'
    return
  }
  sending.value = true
  try {
    await Promise.resolve(
      emit('submit', { latitude: lat, longitude: lng, name: name.value.trim() || undefined }),
    )
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
        <DialogTitle>Enviar localização</DialogTitle>
        <DialogDescription>Latitude, longitude e nome opcional.</DialogDescription>
      </DialogHeader>

      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label>Latitude</Label>
            <Input v-model="latitude" placeholder="-23.5505" />
          </div>
          <div class="space-y-1.5">
            <Label>Longitude</Label>
            <Input v-model="longitude" placeholder="-46.6333" />
          </div>
        </div>

        <div class="space-y-1.5">
          <Label>Nome do lugar (opcional)</Label>
          <Input v-model="name" placeholder="Ex.: Av. Paulista" />
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
