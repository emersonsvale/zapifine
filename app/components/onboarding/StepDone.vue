<script setup lang="ts">
import { Check, Loader2 } from 'lucide-vue-next'

defineProps<{ finishing: boolean }>()
const emit = defineEmits<{ (e: 'finish'): void }>()
</script>

<template>
  <div class="flex flex-col items-center gap-4 py-10 text-center">
    <div class="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-900/60">
      <Check class="h-10 w-10 text-emerald-400" />
    </div>

    <h2 class="text-2xl font-semibold">Tudo pronto!</h2>
    <p class="max-w-md text-sm text-muted-foreground">
      Seu ambiente foi configurado com sucesso. 🚀
    </p>
    <p class="max-w-md text-xs text-muted-foreground">
      Agora você pode começar a usar o Zapifine para atender seus clientes via
      WhatsApp.
    </p>

    <Button class="mt-3" :disabled="finishing" @click="emit('finish')">
      <Loader2 v-if="finishing" class="h-4 w-4 animate-spin" />
      Ir para o Dashboard
    </Button>
  </div>
</template>
