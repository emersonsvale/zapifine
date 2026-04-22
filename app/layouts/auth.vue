<script setup lang="ts">
import { Heart } from 'lucide-vue-next'
</script>

<template>
  <div
    class="min-h-screen grid lg:grid-cols-[minmax(0,44rem)_1fr] bg-background text-foreground"
  >
    <section class="relative flex items-center justify-center px-6 py-10 sm:px-10">
      <div class="w-full max-w-sm">
        <slot />

        <p
          class="mt-12 flex items-center justify-center gap-1 text-xs text-muted-foreground"
        >
          Feito com muito
          <Heart class="h-3.5 w-3.5 fill-primary text-primary" />
          por Vale Apps
        </p>
      </div>
    </section>

    <aside
      class="relative hidden overflow-hidden border-l border-border lg:block"
      aria-hidden="true"
    >
      <img
        src="/imagemWhatsapp.gif"
        alt=""
        class="absolute inset-0 h-full w-full object-cover"
        draggable="false"
      />
      <div
        class="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent"
      />
      <div
        class="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/60"
      />
    </aside>

    <AppToaster />
    <AppConfirmDialog />
  </div>
</template>
