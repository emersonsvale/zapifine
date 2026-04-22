<script setup lang="ts">
import { computed } from 'vue'
import {
  LayoutDashboard,
  Bot,
  Building2,
  MessageCircle,
  MessagesSquare,
  Headphones,
  UsersRound,
  GitBranch,
  List,
  Calendar,
  RefreshCw,
  BellRing,
  CreditCard,
  Settings,
  Rocket,
  Heart,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-vue-next'

type Item = {
  type: 'item'
  to: string
  label: string
  icon: LucideIcon
  badge?: boolean
  minPlan?: number
}
type Group = {
  type: 'group'
  label: string
  icon: LucideIcon
  children: Array<{
    to: string
    label: string
    icon: LucideIcon
    badge?: boolean
    minPlan?: number
  }>
}
type Entry = Item | Group

const nav: Entry[] = [
  { type: 'item', to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { type: 'item', to: '/bot', label: 'Personalização do bot', icon: Bot },
  { type: 'item', to: '/empresa', label: 'Empresa', icon: Building2 },
  { type: 'item', to: '/whatsapp', label: 'Conectar Whatsapp', icon: MessageCircle },
  {
    type: 'group',
    label: 'Multiatendimento',
    icon: Headphones,
    children: [
      { to: '/multiatendimento/chats', label: 'Chats', icon: MessagesSquare, minPlan: 2 },
      { to: '/multiatendimento/configuracoes', label: 'Configurações', icon: Settings, minPlan: 2 },
    ],
  },
  {
    type: 'group',
    label: 'CRM',
    icon: UsersRound,
    children: [
      { to: '/crm/funis', label: 'Funis', icon: GitBranch },
      { to: '/crm/leads', label: 'Gestão de Leads', icon: List },
    ],
  },
  { type: 'item', to: '/agendas', label: 'Agendas e Disponibilidade', icon: Calendar, minPlan: 2 },
  { type: 'item', to: '/follow-up', label: 'Follow-up Automático', icon: RefreshCw, minPlan: 2 },
  {
    type: 'item',
    to: '/lembretes',
    label: 'Lembretes de Atendimento',
    icon: BellRing,
    minPlan: 3,
  },
  { type: 'item', to: '/assinatura', label: 'Minha Assinatura', icon: CreditCard },
  { type: 'item', to: '/configuracoes', label: 'Configurações', icon: Settings },
]

const version = '0.0.1.27.092025-20 beta'

const { subscription, planos } = useSubscription()
const { unreadCount } = useUnreadChats()
const { collapsed, toggle, expand } = useSidebar()

const currentTier = computed(() => {
  const currentValor = subscription.data.value?.plan?.valor_mensal ?? null
  if (currentValor == null) return 0
  const sorted = [...(planos.data.value ?? [])].sort(
    (a, b) => (a.valor_mensal ?? 0) - (b.valor_mensal ?? 0),
  )
  const idx = sorted.findIndex(
    (p) => (p.valor_mensal ?? 0) === Number(currentValor),
  )
  return idx >= 0 ? idx + 1 : 0
})

function isLocked(minPlan?: number) {
  if (!minPlan) return false
  return currentTier.value > 0 && currentTier.value < minPlan
}

function countFor(to: string): number | undefined {
  if (to === '/multiatendimento/chats') return unreadCount.value
  return undefined
}

const resolvedNav = computed(() =>
  nav.map((entry) => {
    if (entry.type === 'item') {
      return {
        ...entry,
        locked: isLocked(entry.minPlan),
        count: countFor(entry.to),
      }
    }
    return {
      ...entry,
      children: entry.children.map((c) => ({
        ...c,
        locked: isLocked(c.minPlan),
        count: countFor(c.to),
      })),
    }
  }),
)

const upsellPlan = computed(() => {
  const list = planos.data.value ?? []
  if (!list.length) return null
  const sorted = [...list].sort(
    (a, b) => (a.valor_mensal ?? 0) - (b.valor_mensal ?? 0),
  )
  const currentId = subscription.data.value?.plan_id ?? null
  const currentValor =
    subscription.data.value?.plan?.valor_mensal ?? null

  if (currentId == null) {
    return sorted[sorted.length - 1] ?? null
  }
  const next = sorted.find(
    (p) => (p.valor_mensal ?? 0) > (currentValor ?? 0),
  )
  return next ?? null
})
</script>

<template>
  <aside
    class="flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200"
    :class="collapsed ? 'w-16' : 'w-64'"
  >
    <div
      class="flex flex-col items-center gap-2 px-3 py-4"
      :class="collapsed ? '' : 'flex-row justify-between'"
    >
      <div v-if="!collapsed" class="flex-1 pl-2">
        <ZapifineLogo :size="36" />
      </div>
      <img
        v-else
        src="/favicon.png"
        alt="Zapifine"
        class="h-9 w-9 rounded-lg object-contain"
        draggable="false"
      />
      <button
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
        :title="collapsed ? 'Expandir menu' : 'Minimizar menu'"
        @click="toggle"
      >
        <PanelLeftOpen v-if="collapsed" class="h-4 w-4" />
        <PanelLeftClose v-else class="h-4 w-4" />
      </button>
    </div>

    <nav
      class="flex-1 overflow-y-auto py-2"
      :class="collapsed ? 'px-2' : 'px-3'"
    >
      <ul
        class="space-y-0.5"
        :class="collapsed ? 'flex flex-col items-center' : ''"
      >
        <li
          v-for="entry in resolvedNav"
          :key="entry.type === 'item' ? entry.to : entry.label"
        >
          <AppNavItem
            v-if="entry.type === 'item'"
            :to="entry.to"
            :label="entry.label"
            :icon="entry.icon"
            :badge="entry.badge"
            :locked="entry.locked"
            :count="entry.count"
            :collapsed="collapsed"
          />
          <AppNavGroup
            v-else
            :label="entry.label"
            :icon="entry.icon"
            :children="entry.children"
            :collapsed="collapsed"
            @expand-sidebar="expand"
          />
        </li>
      </ul>
    </nav>

    <div v-if="upsellPlan && !collapsed" class="px-3 pb-3">
      <div
        class="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/60 via-[#1a1030] to-purple-950/40 p-4 text-center"
      >
        <Rocket class="mx-auto mb-2 h-9 w-9 text-indigo-300" />
        <p class="text-xs text-muted-foreground">Faça mais com o plano</p>
        <p class="text-lg font-bold text-cyan-300">{{ upsellPlan.nome }}</p>
        <ul class="mt-2 space-y-0.5 text-xs text-muted-foreground">
          <li>+ Recursos</li>
          <li>+ Gestão</li>
          <li>+ Mensagens</li>
          <li>+ Integrações</li>
          <li class="font-semibold text-sidebar-foreground">MUITO MAIS!</li>
        </ul>
        <Button class="mt-3 w-full" size="sm" as-child>
          <NuxtLink to="/planos">Conferir</NuxtLink>
        </Button>
      </div>
    </div>

    <div
      v-if="!collapsed"
      class="border-t border-sidebar-border px-5 py-3 text-xs text-muted-foreground"
    >
      <p class="mb-1">{{ version }}</p>
      <p class="flex items-center gap-1">
        Feito com muito
        <Heart class="h-3 w-3 fill-primary text-primary" />
        por Vale Apps
      </p>
    </div>
  </aside>
</template>
