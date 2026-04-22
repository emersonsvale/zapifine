<script setup lang="ts">
import { MessageCircle } from 'lucide-vue-next'

const emit = defineEmits<{ (e: 'next'): void }>()
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold">Conectar WhatsApp</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Conecte o número de WhatsApp da sua empresa para começar a usar o
        Zapifine.
      </p>
    </div>

    <div class="rounded-xl border bg-card p-8 text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-900/40">
        <MessageCircle class="h-8 w-8 text-emerald-400" />
      </div>
      <p class="text-sm font-semibold">Conexão do WhatsApp</p>
      <p class="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
        A conexão é feita na tela dedicada, onde você vai escanear o QR Code e
        concluir o pareamento com segurança.
      </p>

      <div class="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <Button as-child>
          <NuxtLink to="/whatsapp">Conectar agora</NuxtLink>
        </Button>
        <Button variant="outline" @click="emit('next')">
          Pular por enquanto
        </Button>
      </div>
    </div>

    <div class="flex justify-end">
      <Button @click="emit('next')">Salvar e Continuar</Button>
    </div>
  </div>
</template>
