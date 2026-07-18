<script setup lang="ts">
import { computed } from 'vue'
import {
  Pencil,
  Bot,
  PanelRightClose,
  Mail,
  Phone,
  IdCard,
  Building2,
  Briefcase,
  Target,
  DollarSign,
  CalendarClock,
  Tag,
  Sparkles,
  MessageSquare,
  Flag,
  Compass,
} from 'lucide-vue-next'
import type { Database } from '~~/types/database'
import { formatPhone } from '~/lib/utils'

type Lead = Database['public']['Tables']['leads']['Row']

const props = defineProps<{
  lead: Lead | null
  funilName?: string | null
  colunaName?: string | null
  tags?: string[]
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'close'): void
}>()

const email = computed(
  () =>
    (props.lead as unknown as { 'e-mail'?: string | null } | null)?.['e-mail'] ??
    null,
)

const initials = computed(() => {
  const name = props.lead?.nome_lead
  if (!name) return '?'
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
})

const iaAtiva = computed(() => !!props.lead?.ia_ativa)

const valorFmt = computed(() => {
  const v = props.lead?.valor_negocio
  if (v == null || (v as unknown as string) === '') return null
  const n = Number(v)
  if (Number.isNaN(n)) return null
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
})

const prioridadeLabel = computed(() => {
  const p = props.lead?.prioridade
  if (!p || p === 'none') return null
  return (
    ({ baixa: 'Baixa', media: 'Média', alta: 'Alta' } as Record<string, string>)[
      p as string
    ] ?? p
  )
})

const prioridadeColor = computed(() => {
  switch (props.lead?.prioridade) {
    case 'alta':
      return 'text-red-600 bg-red-500/10'
    case 'media':
      return 'text-amber-600 bg-amber-500/10'
    case 'baixa':
      return 'text-sky-600 bg-sky-500/10'
    default:
      return 'text-muted-foreground bg-muted'
  }
})

const proximaAcaoData = computed(() => {
  const d = props.lead?.proxima_acao_data
  if (!d) return null
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const funilLabel = computed(() => {
  const f = props.funilName
  const c = props.colunaName
  if (f && c) return `${f} → ${c}`
  return f || c || null
})

const tagList = computed(() => props.tags ?? [])

const hasEmpresa = computed(() => !!(props.lead?.empresa || props.lead?.cargo))
const hasNegocio = computed(
  () =>
    !!(
      funilLabel.value ||
      valorFmt.value ||
      prioridadeLabel.value ||
      props.lead?.origem ||
      props.lead?.proxima_acao
    ),
)
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-background">
    <!-- Header -->
    <div class="flex shrink-0 items-start gap-3 border-b px-4 py-3">
      <div class="shrink-0">
        <img
          v-if="lead?.avatar_url"
          :src="lead.avatar_url"
          class="h-12 w-12 rounded-full object-cover"
          alt=""
        >
        <div
          v-else
          class="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-base font-semibold"
        >
          {{ initials }}
        </div>
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold">
          {{ lead?.nome_lead || 'Lead sem nome' }}
        </p>
        <p class="truncate text-xs text-muted-foreground">
          {{ lead?.numero_whatsapp_lead ? formatPhone(lead.numero_whatsapp_lead) : '—' }}
        </p>
        <span
          class="mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
          :class="iaAtiva ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600' : 'text-muted-foreground'"
        >
          <Bot class="h-3 w-3" />
          {{ iaAtiva ? 'IA Ativa' : 'IA Inativa' }}
        </span>
      </div>
      <button
        type="button"
        class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded hover:bg-accent text-muted-foreground"
        title="Recolher painel"
        @click="emit('close')"
      >
        <PanelRightClose class="h-4 w-4" />
      </button>
    </div>

    <!-- Body -->
    <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-4">
      <!-- Contato -->
      <section class="space-y-2">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Contato
        </p>
        <div class="space-y-2">
          <div v-if="email" class="flex items-start gap-2 text-sm">
            <Mail class="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span class="min-w-0 break-words">{{ email }}</span>
          </div>
          <div v-if="lead?.telefone_secundario" class="flex items-start gap-2 text-sm">
            <Phone class="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span class="min-w-0 break-words">{{ lead.telefone_secundario }}</span>
          </div>
          <div v-if="lead?.cpf" class="flex items-start gap-2 text-sm">
            <IdCard class="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span class="min-w-0 break-words">{{ lead.cpf }}</span>
          </div>
          <p
            v-if="!email && !lead?.telefone_secundario && !lead?.cpf"
            class="text-xs text-muted-foreground"
          >
            Sem dados de contato extras.
          </p>
        </div>
      </section>

      <!-- Empresa -->
      <section v-if="hasEmpresa" class="space-y-2">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Empresa
        </p>
        <div class="space-y-2">
          <div v-if="lead?.empresa" class="flex items-start gap-2 text-sm">
            <Building2 class="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span class="min-w-0 break-words">{{ lead.empresa }}</span>
          </div>
          <div v-if="lead?.cargo" class="flex items-start gap-2 text-sm">
            <Briefcase class="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span class="min-w-0 break-words">{{ lead.cargo }}</span>
          </div>
        </div>
      </section>

      <!-- Negócio -->
      <section v-if="hasNegocio" class="space-y-2">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Negócio
        </p>
        <div class="space-y-2">
          <div v-if="funilLabel" class="flex items-start gap-2 text-sm">
            <Target class="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
            <span class="min-w-0 break-words">{{ funilLabel }}</span>
          </div>
          <div v-if="valorFmt" class="flex items-start gap-2 text-sm">
            <DollarSign class="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span class="min-w-0 break-words font-medium">{{ valorFmt }}</span>
          </div>
          <div v-if="prioridadeLabel" class="flex items-center gap-2 text-sm">
            <Flag class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span
              class="rounded px-1.5 py-0.5 text-[11px] font-medium"
              :class="prioridadeColor"
            >
              {{ prioridadeLabel }}
            </span>
          </div>
          <div v-if="lead?.origem" class="flex items-start gap-2 text-sm">
            <Compass class="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span class="min-w-0 break-words">{{ lead.origem }}</span>
          </div>
          <div v-if="lead?.proxima_acao" class="flex items-start gap-2 text-sm">
            <CalendarClock class="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span class="min-w-0 break-words">
              {{ lead.proxima_acao }}
              <span v-if="proximaAcaoData" class="block text-[11px] text-muted-foreground">
                {{ proximaAcaoData }}
              </span>
            </span>
          </div>
        </div>
      </section>

      <!-- Tags -->
      <section v-if="tagList.length" class="space-y-2">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Tags
        </p>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="t in tagList"
            :key="t"
            class="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
          >
            <Tag class="h-3 w-3" />
            {{ t }}
          </span>
        </div>
      </section>

      <!-- Resumo IA -->
      <section v-if="lead?.resumo_lead" class="space-y-2">
        <p class="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles class="h-3 w-3" /> Resumo
        </p>
        <p class="whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-sm leading-relaxed">
          {{ lead.resumo_lead }}
        </p>
      </section>

      <!-- Observação -->
      <section v-if="lead?.observacao" class="space-y-2">
        <p class="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <MessageSquare class="h-3 w-3" /> Observações
        </p>
        <p class="whitespace-pre-wrap text-sm leading-relaxed">
          {{ lead.observacao }}
        </p>
      </section>
    </div>

    <!-- Footer -->
    <div class="shrink-0 border-t p-3">
      <Button
        type="button"
        variant="outline"
        class="w-full gap-1.5"
        @click="emit('edit')"
      >
        <Pencil class="h-4 w-4" />
        Editar dados do lead
      </Button>
    </div>
  </div>
</template>
