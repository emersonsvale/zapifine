<script setup lang="ts">
import { computed } from 'vue'
import {
  User as UserIcon,
  Mail,
  Phone,
  Tag,
  Target,
  MessageSquare,
  Bot,
  BotOff,
  MapPin,
} from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Lead = Database['public']['Tables']['leads']['Row']

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  lead: Lead | null
}>()

const emit = defineEmits<{
  (e: 'edit'): void
}>()

const email = computed(
  () => (props.lead as unknown as { 'e-mail'?: string | null })?.['e-mail'] ?? null,
)

const tagsText = computed(() =>
  props.lead?.tags?.length ? props.lead.tags.join(', ') : null,
)

const locationText = computed(() => {
  const parts = [props.lead?.cidade, props.lead?.estado].filter(Boolean)
  return parts.length ? parts.join(' / ') : null
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <UserIcon class="h-5 w-5" />
          {{ lead?.nome_lead ?? `Lead #${lead?.id ?? '?'}` }}
        </DialogTitle>
      </DialogHeader>

      <div v-if="lead" class="space-y-4 text-sm">
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="space-y-1">
            <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone class="h-3.5 w-3.5" />
              WhatsApp
            </p>
            <p class="font-medium">
              {{ lead.numero_whatsapp_lead ?? '—' }}
            </p>
          </div>

          <div class="space-y-1">
            <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail class="h-3.5 w-3.5" />
              E-mail
            </p>
            <p class="font-medium">{{ email ?? '—' }}</p>
          </div>

          <div class="space-y-1">
            <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Target class="h-3.5 w-3.5" />
              Origem
            </p>
            <p class="font-medium">{{ lead.origem ?? '—' }}</p>
          </div>

          <div class="space-y-1">
            <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Tag class="h-3.5 w-3.5" />
              Tags
            </p>
            <p class="font-medium">{{ tagsText ?? '—' }}</p>
          </div>

          <div class="space-y-1">
            <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin class="h-3.5 w-3.5" />
              Localização
            </p>
            <p class="font-medium">{{ locationText ?? '—' }}</p>
          </div>

          <div class="space-y-1">
            <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Bot class="h-3.5 w-3.5" />
              IA
            </p>
            <span
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
              :class="
                lead.ia_ativa
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-muted text-muted-foreground'
              "
            >
              <Bot v-if="lead.ia_ativa" class="h-3 w-3" />
              <BotOff v-else class="h-3 w-3" />
              {{ lead.ia_ativa ? 'Ativa' : 'Desativada' }}
            </span>
          </div>
        </div>

        <div v-if="lead.resumo_lead" class="space-y-1">
          <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageSquare class="h-3.5 w-3.5" />
            Resumo
          </p>
          <p class="rounded-md border bg-muted/20 px-3 py-2 text-sm">
            {{ lead.resumo_lead }}
          </p>
        </div>

        <div v-if="lead.observacao" class="space-y-1">
          <p class="text-xs text-muted-foreground">Observação</p>
          <p class="rounded-md border bg-muted/20 px-3 py-2 text-sm">
            {{ lead.observacao }}
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">Fechar</Button>
        <Button @click="emit('edit')">Editar lead</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
