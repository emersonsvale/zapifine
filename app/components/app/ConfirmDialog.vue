<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'

const { confirmState, resolveConfirm } = useAlerts()

const open = computed({
  get: () => confirmState.value.open,
  set: (v) => {
    if (!v) resolveConfirm(false)
  },
})

const variant = computed(() => confirmState.value.variant ?? 'default')
const title = computed(() => confirmState.value.title ?? 'Confirmar ação')
const description = computed(() => confirmState.value.description ?? '')
const confirmLabel = computed(
  () => confirmState.value.confirmLabel ?? 'Confirmar',
)
const cancelLabel = computed(
  () => confirmState.value.cancelLabel ?? 'Cancelar',
)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <div class="flex items-start gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            :class="
              variant === 'danger'
                ? 'bg-destructive/15 text-destructive'
                : 'bg-primary/15 text-primary'
            "
          >
            <AlertTriangle class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <DialogTitle>{{ title }}</DialogTitle>
            <DialogDescription v-if="description" class="mt-1">
              {{ description }}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <DialogFooter>
        <Button variant="outline" @click="resolveConfirm(false)">
          {{ cancelLabel }}
        </Button>
        <Button
          :variant="variant === 'danger' ? 'destructive' : 'default'"
          @click="resolveConfirm(true)"
        >
          {{ confirmLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
