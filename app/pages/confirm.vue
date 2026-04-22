<script setup lang="ts">
definePageMeta({ layout: false })

const user = useSupabaseUser()

watch(
  user,
  async (u) => {
    if (u) {
      await navigateTo('/dashboard', { replace: true })
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-[#0A0A0B] text-zinc-400">
    <p class="text-sm">Autenticando...</p>
  </div>
</template>
