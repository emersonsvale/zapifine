<script setup lang="ts">
import { Plus, ChevronDown } from 'lucide-vue-next'
import { PROVIDER_META, type ChannelType } from '~/composables/useChannelConnections'

const emit = defineEmits<{ (e: 'select', provider: ChannelType): void }>()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button>
        <Plus class="h-4 w-4" />
        Nova conexão
        <ChevronDown class="h-4 w-4 opacity-70" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-72">
      <DropdownMenuLabel>Escolha o tipo</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        v-for="p in PROVIDER_META"
        :key="p.value"
        :disabled="!p.available"
        class="flex flex-col items-start gap-0.5 py-2"
        @select="p.available && emit('select', p.value)"
      >
        <div class="flex w-full items-center justify-between">
          <span class="font-medium">{{ p.label }}</span>
          <Badge v-if="!p.available" variant="secondary" class="text-[10px]">Em breve</Badge>
        </div>
        <span class="text-xs text-muted-foreground">{{ p.description }}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
