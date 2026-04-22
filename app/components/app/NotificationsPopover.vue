<script setup lang="ts">
import {
  Bell,
  MessageSquare,
  UserPlus,
  Calendar,
  AlertTriangle,
  AlertCircle,
  CreditCard,
} from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Tipo = Database['public']['Enums']['enum_notification']

const { notifications, unreadCount, markAsRead, markAllAsRead } =
  useNotifications()

function iconFor(tipo: Tipo | null) {
  switch (tipo) {
    case 'mensagem':
      return MessageSquare
    case 'lead':
      return UserPlus
    case 'agenda':
      return Calendar
    case 'alerta':
      return AlertTriangle
    case 'atencao':
      return AlertCircle
    case 'pagamento':
      return CreditCard
    default:
      return Bell
  }
}

function colorFor(tipo: Tipo | null) {
  switch (tipo) {
    case 'mensagem':
      return 'bg-emerald-500/15 text-emerald-400'
    case 'lead':
      return 'bg-cyan-500/15 text-cyan-400'
    case 'agenda':
      return 'bg-violet-500/15 text-violet-400'
    case 'pagamento':
      return 'bg-amber-500/15 text-amber-400'
    case 'alerta':
      return 'bg-red-500/15 text-red-400'
    case 'atencao':
      return 'bg-orange-500/15 text-orange-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
})

function formatDate(iso: string | null) {
  return iso ? dateFmt.format(new Date(iso)) : ''
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <button
        type="button"
        class="relative flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary outline-none transition-colors hover:bg-primary/25 focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Notificações"
      >
        <Bell class="h-5 w-5" />
        <span
          v-if="unreadCount > 0"
          class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </button>
    </PopoverTrigger>

    <PopoverContent align="end" class="w-[360px] p-0">
      <div class="flex items-center justify-between border-b px-4 py-3">
        <h3 class="text-base font-semibold">Notificações</h3>
        <button
          v-if="unreadCount > 0"
          type="button"
          class="text-xs font-medium text-primary hover:text-primary/80"
          @click="markAllAsRead()"
        >
          Marcar todas
        </button>
      </div>

      <div class="max-h-[420px] overflow-y-auto">
        <p
          v-if="!notifications || notifications.length === 0"
          class="px-4 py-8 text-center text-sm text-muted-foreground"
        >
          Sem notificações.
        </p>

        <ul v-else class="divide-y">
          <li
            v-for="n in notifications"
            :key="n.id"
            class="px-4 py-3"
            :class="{ 'bg-primary/[0.04]': !n.read }"
          >
            <div class="flex items-start gap-3">
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                :class="colorFor(n.tipo)"
              >
                <component :is="iconFor(n.tipo)" class="h-4 w-4" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold">{{ n.title }}</p>
                <p class="mt-0.5 text-sm text-muted-foreground">
                  {{ n.message }}
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ formatDate(n.created_at) }}
                </p>
                <button
                  v-if="!n.read"
                  type="button"
                  class="mt-2 text-xs font-medium text-primary hover:text-primary/80"
                  @click="markAsRead(n.id)"
                >
                  Marcar como lido
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </PopoverContent>
  </Popover>
</template>
