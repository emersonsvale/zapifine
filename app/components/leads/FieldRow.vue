<script setup lang="ts">
import { Loader2, Check, AlertCircle } from 'lucide-vue-next'
import type { Component } from 'vue'

defineProps<{
  label: string
  icon?: Component
  state?: 'idle' | 'saving' | 'saved' | 'error'
}>()
</script>

<template>
  <div class="space-y-2">
    <Label class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <component :is="icon" v-if="icon" class="h-3.5 w-3.5" />
      <span>{{ label }}</span>
      <span class="ml-auto inline-flex items-center">
        <Loader2 v-if="state === 'saving'" class="h-3 w-3 animate-spin text-muted-foreground" />
        <Check v-else-if="state === 'saved'" class="h-3 w-3 text-emerald-500" />
        <AlertCircle v-else-if="state === 'error'" class="h-3 w-3 text-destructive" />
      </span>
    </Label>
    <slot />
  </div>
</template>
