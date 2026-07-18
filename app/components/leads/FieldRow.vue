<script setup lang="ts">
import { Loader2, Check, AlertCircle, HelpCircle } from 'lucide-vue-next'
import type { Component } from 'vue'

defineProps<{
  label: string
  icon?: Component
  /** Explicação do campo, mostrada ao passar o mouse (title nativo). */
  hint?: string
  state?: 'idle' | 'saving' | 'saved' | 'error'
}>()
</script>

<template>
  <div class="space-y-2">
    <Label class="flex items-center gap-1.5 text-xs font-semibold text-foreground">
      <component :is="icon" v-if="icon" class="h-3.5 w-3.5 text-muted-foreground" />
      <span>{{ label }}</span>
      <Tooltip v-if="hint">
        <TooltipTrigger as-child>
          <button
            type="button"
            tabindex="-1"
            :aria-label="`Ajuda: ${label}`"
            class="inline-flex cursor-help text-muted-foreground/60 transition-colors hover:text-foreground"
          >
            <HelpCircle class="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" :side-offset="6">
          {{ hint }}
        </TooltipContent>
      </Tooltip>
      <span class="ml-auto inline-flex items-center">
        <Loader2 v-if="state === 'saving'" class="h-3 w-3 animate-spin text-muted-foreground" />
        <Check v-else-if="state === 'saved'" class="h-3 w-3 text-emerald-500" />
        <AlertCircle v-else-if="state === 'error'" class="h-3 w-3 text-destructive" />
      </span>
    </Label>
    <slot />
  </div>
</template>
