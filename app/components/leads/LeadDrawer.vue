<script setup lang="ts">
import type { Database } from '~~/types/database'

type Lead = Database['public']['Tables']['leads']['Row']
type Column = Database['public']['Tables']['ff_colunas_funil']['Row']

const open = defineModel<boolean>('open', { default: false })

defineProps<{
  lead: Lead | null
  columns: Column[]
}>()

const emit = defineEmits<{
  (e: 'deleted', id: number): void
}>()
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent side="right" class="p-0 gap-0 sm:max-w-[600px] flex flex-col">
      <LeadsLeadForm
        :lead="lead"
        :columns="columns"
        @deleted="(id) => emit('deleted', id)"
        @close="open = false"
      />
    </SheetContent>
  </Sheet>
</template>
