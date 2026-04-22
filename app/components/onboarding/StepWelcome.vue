<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'

const props = defineProps<{ userName: string | null }>()
const emit = defineEmits<{ (e: 'next'): void }>()
</script>

<template>
  <div class="flex flex-col items-center gap-5 py-10 text-center">
    <div class="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-900/60">
      <Sparkles class="h-8 w-8 text-emerald-400" />
    </div>
    <h1 class="text-2xl font-semibold">
      Olá{{ props.userName ? `, ${props.userName}` : '' }}
    </h1>
    <p class="max-w-md text-sm text-muted-foreground">
      Vamos deixar tudo pronto para você começar a usar o Zapifine em poucos
      minutos. 😄
    </p>
    <Button class="mt-2" @click="emit('next')">Começar Configuração</Button>
  </div>
</template>
