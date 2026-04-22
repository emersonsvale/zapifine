<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Plan = Database['public']['Tables']['plan']['Row']

const props = defineProps<{
  plan: Plan | null
}>()

const recursos = computed(() => props.plan?.recursos ?? [])
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-2xl">Recursos Inclusos</CardTitle>
      <CardDescription>
        O que está incluído no seu plano {{ plan?.nome ?? '—' }}
      </CardDescription>
    </CardHeader>

    <CardContent>
      <p
        v-if="!recursos.length"
        class="text-sm text-muted-foreground"
      >
        Nenhum recurso listado.
      </p>
      <ul v-else class="space-y-3">
        <li
          v-for="(r, i) in recursos"
          :key="i"
          class="flex items-start gap-2 text-sm"
        >
          <Check class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <span>{{ r }}</span>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
