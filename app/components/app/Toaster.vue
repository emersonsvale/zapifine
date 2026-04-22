<script setup lang="ts">
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-vue-next'
import type { ToastKind } from '~/composables/useAlerts'

const { toasts, dismiss } = useAlerts()

const iconFor: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

const classFor: Record<ToastKind, string> = {
  success:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 [--ic:theme(colors.emerald.400)]',
  error:
    'border-destructive/30 bg-destructive/10 text-destructive [--ic:theme(colors.red.400)]',
  info:
    'border-sky-500/30 bg-sky-500/10 text-sky-300 [--ic:theme(colors.sky.400)]',
  warning:
    'border-amber-500/30 bg-amber-500/10 text-amber-300 [--ic:theme(colors.amber.400)]',
}
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed right-4 top-4 z-[9999] flex w-full max-w-sm flex-col gap-2"
    >
      <TransitionGroup
        enter-from-class="opacity-0 translate-x-4"
        enter-active-class="transition duration-200"
        leave-to-class="opacity-0 translate-x-4"
        leave-active-class="transition duration-150"
      >
        <div
          v-for="t in toasts"
          :key="t.id"
          class="pointer-events-auto flex items-start gap-3 rounded-lg border px-3 py-3 shadow-lg backdrop-blur-sm"
          :class="classFor[t.kind]"
          role="status"
        >
          <component
            :is="iconFor[t.kind]"
            class="mt-0.5 h-5 w-5 shrink-0"
            style="color: var(--ic)"
          />
          <div class="min-w-0 flex-1 text-sm">
            <p v-if="t.title" class="font-semibold">{{ t.title }}</p>
            <p class="leading-snug">{{ t.message }}</p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-md p-0.5 text-current/70 transition hover:text-current"
            @click="dismiss(t.id)"
            aria-label="Fechar"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
