<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  description: string
  time: string
}>()

const initial = computed(() => {
  const trimmed = props.name.trim()
  return trimmed ? trimmed[0]!.toUpperCase() : '?'
})
</script>

<template>
  <div class="flex items-start gap-3 py-3">
    <Avatar class="h-9 w-9">
      <AvatarFallback class="bg-muted text-sm font-medium">
        {{ initial }}
      </AvatarFallback>
    </Avatar>
    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-2">
        <p class="text-sm font-medium">{{ name }}</p>
        <span class="text-xs text-muted-foreground">{{ time }}</span>
      </div>
      <p class="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
        {{ description }}
      </p>
    </div>
  </div>
</template>
