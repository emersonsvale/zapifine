<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value: string | number
    hint?: string
    accent?: 'emerald' | 'cyan' | 'violet' | 'amber'
  }>(),
  { accent: 'emerald' },
)

const sparkPoints = '0,24 12,20 24,22 36,14 48,18 60,10 72,16 84,6 96,12'
</script>

<template>
  <Card>
    <CardContent class="flex h-full flex-col justify-between gap-6">
      <div>
        <p class="text-sm text-muted-foreground">{{ label }}</p>
        <p class="mt-3 text-3xl font-semibold tracking-tight">
          {{ value }}
        </p>
        <p v-if="hint" class="mt-3 text-xs text-muted-foreground">{{ hint }}</p>
      </div>

      <svg
        viewBox="0 0 96 28"
        class="h-6 w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          :points="sparkPoints"
          fill="none"
          :stroke="{
            emerald: '#10B981',
            cyan: '#22D3EE',
            violet: '#A855F7',
            amber: '#F59E0B',
          }[accent]"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </CardContent>
  </Card>
</template>
