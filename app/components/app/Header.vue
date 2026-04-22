<script setup lang="ts">
import { computed } from 'vue'
import { BookOpen } from 'lucide-vue-next'

const { data: currentUser } = useCurrentUser()

const displayName = computed(() => {
  const u = currentUser.value
  return u?.nome?.trim() || u?.email || 'Visitante'
})

const quotes = [
  'Cada pequena vitória conta. Celebre seu progresso!',
  'A jornada continua. O sucesso está logo ali na próxima curva.',
  'Disciplina hoje, liberdade amanhã.',
  'Um passo por vez, mas nunca pare.',
  'Construa o hábito, o resultado vem junto.',
]

const quote = computed(() => {
  const dayIndex = Math.floor(Date.now() / 86_400_000)
  return quotes[dayIndex % quotes.length]!
})
</script>

<template>
  <header
    class="flex h-20 items-center justify-end gap-4 border-b border-sidebar-border bg-background/80 px-8 backdrop-blur"
  >
    <div class="text-right">
      <p class="text-sm font-medium">Olá, {{ displayName }}</p>
      <p
        class="mt-0.5 flex items-center justify-end gap-1.5 text-xs text-muted-foreground"
      >
        <BookOpen class="h-3.5 w-3.5 text-primary" />
        <span class="italic">"{{ quote }}"</span>
      </p>
    </div>

    <AppUserMenu />
    <AppNotificationsPopover />
  </header>
</template>
