<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  Loader2,
  Trash2,
  Bot,
  Sparkles,
  User as UserIcon,
  Mail,
  Tag,
  Target,
  MessageSquare,
  BadgeCheck,
} from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Lead = Database['public']['Tables']['leads']['Row']
type Column = Database['public']['Tables']['ff_colunas_funil']['Row']

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  lead: Lead | null
  columns: Column[]
}>()

const { updateLead, deleteLead, toggleIa } = useLeads()
const { toast, confirm } = useAlerts()

const form = reactive({
  nome_lead: '',
  email: '',
  country: '+55',
  numero_local: '',
  tags: '',
  prioridade: 'none',
  origem: '',
  observacao: '',
  resumo_lead: '',
})
const saving = ref(false)
const togglingIa = ref(false)
const removing = ref(false)
const errorMsg = ref('')

function splitNumber(raw: string | null | undefined) {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (!digits) return { country: '+55', local: '' }
  if (digits.startsWith('55') && digits.length > 10) {
    return { country: '+55', local: digits.slice(2) }
  }
  return { country: '+55', local: digits }
}

watch(
  () => ({ open: open.value, lead: props.lead }),
  ({ open: o, lead }) => {
    if (!o || !lead) return
    const { country, local } = splitNumber(lead.numero_whatsapp_lead)
    form.nome_lead = lead.nome_lead ?? ''
    form.email =
      (lead as unknown as { 'e-mail'?: string | null })['e-mail'] ?? ''
    form.country = country
    form.numero_local = local
    form.tags = (lead.tags ?? []).join(', ')
    form.prioridade = lead.prioridade ?? 'none'
    form.origem = lead.origem ?? ''
    form.observacao = lead.observacao ?? ''
    form.resumo_lead = lead.resumo_lead ?? ''
    errorMsg.value = ''
  },
  { immediate: true },
)

const colunaLabel = computed(() => {
  if (!props.lead?.coluna_id) return null
  return (
    props.columns.find((c) => c.id === props.lead?.coluna_id)?.nome_coluna ??
    null
  )
})

const remoteJidShort = computed(
  () =>
    props.lead?.remoteJid_lead ??
    props.lead?.numero_whatsapp_lead ??
    '—',
)

const iaAtiva = computed(() => !!props.lead?.ia_ativa)

async function handleToggleIa() {
  if (!props.lead) return
  togglingIa.value = true
  errorMsg.value = ''
  try {
    await toggleIa(props.lead.id)
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : 'Falha ao alternar IA.'
  } finally {
    togglingIa.value = false
  }
}

async function handleDelete() {
  if (!props.lead) return
  const ok = await confirm({
    title: 'Remover lead',
    description: 'Esta ação não pode ser desfeita.',
    confirmLabel: 'Remover',
    variant: 'danger',
  })
  if (!ok) return
  removing.value = true
  errorMsg.value = ''
  try {
    await deleteLead(props.lead.id)
    toast.success('Lead removido.')
    open.value = false
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : 'Falha ao remover.'
  } finally {
    removing.value = false
  }
}

async function submit() {
  if (!props.lead) return
  errorMsg.value = ''
  saving.value = true
  try {
    const tagList = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const countryDigits = form.country.replace(/\D/g, '')
    const localDigits = form.numero_local.replace(/\D/g, '')
    const numero = localDigits ? `${countryDigits}${localDigits}` : null
    await updateLead(props.lead.id, {
      nome_lead: form.nome_lead.trim() || null,
      numero_whatsapp_lead: numero,
      email: form.email.trim() || null,
      origem: form.origem.trim() || null,
      prioridade:
        form.prioridade && form.prioridade !== 'none'
          ? form.prioridade
          : null,
      tags: tagList.length ? tagList : null,
      observacao: form.observacao.trim() || null,
      resumo_lead: form.resumo_lead.trim() || null,
    })
    open.value = false
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : 'Falha ao salvar lead.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogScrollContent class="sm:max-w-xl">
      <DialogTitle class="sr-only">Editar lead</DialogTitle>
      <DialogDescription class="sr-only">
        Atualize os dados do lead.
      </DialogDescription>

      <button
        type="button"
        class="absolute right-12 top-4 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive disabled:opacity-50"
        :disabled="removing"
        title="Remover lead"
        @click="handleDelete"
      >
        <Loader2 v-if="removing" class="h-4 w-4 animate-spin" />
        <Trash2 v-else class="h-4 w-4" />
      </button>

      <div class="space-y-5">
        <!-- Header -->
        <div class="pr-20">
          <h2 class="truncate text-xl font-semibold">
            {{ lead?.nome_lead || 'Lead sem nome' }}
          </h2>
          <p class="mt-1 truncate text-xs text-muted-foreground">
            Contato: {{ remoteJidShort }}
          </p>
        </div>

        <!-- Chips -->
        <div class="flex flex-wrap items-center gap-2">
          <Badge v-if="colunaLabel" variant="secondary" class="rounded-full">
            {{ colunaLabel }}
          </Badge>
          <Badge
            variant="secondary"
            class="gap-1 rounded-full"
            :class="iaAtiva ? 'text-emerald-500' : 'text-muted-foreground'"
          >
            <Bot class="h-3 w-3" />
            {{ iaAtiva ? 'IA Ativa' : 'IA Inativa' }}
          </Badge>
          <span
            class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white"
            title="WhatsApp"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-3.5 w-3.5 fill-current"
              aria-hidden="true"
            >
              <path
                d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 2.1.55 4.15 1.6 5.95L2 22l4.26-1.12a9.94 9.94 0 0 0 5.78 1.84h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.14c-.24.68-1.42 1.3-1.96 1.38-.5.07-1.14.1-1.83-.12-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.83-4.2-4.98-4.39-.14-.2-1.19-1.58-1.19-3.02 0-1.43.75-2.13 1.01-2.42.26-.28.57-.35.76-.35l.54.01c.17 0 .41-.07.64.49.24.58.81 2 .88 2.14.07.14.12.3.02.48-.09.19-.14.3-.28.46-.14.16-.3.36-.42.49-.14.14-.29.29-.12.57.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.34 1.44.29.14.46.12.63-.07.17-.19.73-.85.93-1.14.19-.29.39-.24.66-.14.27.1 1.71.81 2 .96.29.14.49.22.56.34.07.12.07.68-.17 1.36Z"
              />
            </svg>
          </span>
        </div>

        <!-- IA toggle -->
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-lg border bg-muted/20 px-4 py-3 text-left transition-colors hover:bg-muted/40"
          :disabled="togglingIa"
          @click="handleToggleIa"
        >
          <span class="text-sm font-medium">Resposta Automática da IA</span>
          <span class="flex items-center gap-2 text-xs">
            <span
              class="h-2.5 w-2.5 rounded-full"
              :class="iaAtiva ? 'bg-emerald-500' : 'bg-muted-foreground/40'"
            />
            <span :class="iaAtiva ? 'text-emerald-500' : 'text-muted-foreground'">
              {{ togglingIa ? 'Alterando...' : iaAtiva ? 'Ativado' : 'Desativado' }}
            </span>
          </span>
        </button>

        <!-- Resumo -->
        <div class="space-y-1.5">
          <Label class="flex items-center gap-1.5 text-sm">
            <Sparkles class="h-4 w-4 text-primary" />
            Resumo do lead
          </Label>
          <textarea
            v-model="form.resumo_lead"
            rows="4"
            class="flex w-full rounded-md border bg-muted/20 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            placeholder="Resumo gerado pela IA..."
          />
          <p class="text-xs text-muted-foreground">
            Texto criado e mapeado pela sua IA
          </p>
        </div>

        <form class="space-y-4" @submit.prevent="submit">
          <!-- Nome -->
          <div class="space-y-1.5">
            <Label for="edit-nome" class="flex items-center gap-1.5 text-sm">
              <UserIcon class="h-4 w-4" />
              Nome do lead
            </Label>
            <Input
              id="edit-nome"
              v-model="form.nome_lead"
              placeholder="Nome do lead"
            />
          </div>

          <!-- Email -->
          <div class="space-y-1.5">
            <Label for="edit-email" class="flex items-center gap-1.5 text-sm">
              <Mail class="h-4 w-4" />
              E-mail do lead
            </Label>
            <Input
              id="edit-email"
              v-model="form.email"
              type="email"
              placeholder="email@exemplo.com"
              autocomplete="off"
            />
          </div>

          <!-- WhatsApp -->
          <div class="space-y-1.5">
            <Label class="flex items-center gap-1.5 text-sm">
              <span
                class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white"
              >
                <svg viewBox="0 0 24 24" class="h-2.5 w-2.5 fill-current">
                  <path
                    d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 2.1.55 4.15 1.6 5.95L2 22l4.26-1.12a9.94 9.94 0 0 0 5.78 1.84h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Z"
                  />
                </svg>
              </span>
              WhatsApp
            </Label>
            <div class="flex items-center gap-2">
              <Select v-model="form.country">
                <SelectTrigger class="w-[96px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="+55">+55</SelectItem>
                </SelectContent>
              </Select>
              <Input
                v-model="form.numero_local"
                placeholder="(00) 0 0000-0000"
                inputmode="tel"
                class="flex-1"
              />
              <Button
                type="button"
                class="gap-1 bg-emerald-500 text-white hover:bg-emerald-600"
                disabled
                title="Validação em breve"
              >
                Validar
                <BadgeCheck class="h-4 w-4" />
              </Button>
            </div>
          </div>

          <!-- Tags -->
          <div class="space-y-1.5">
            <Label for="edit-tags" class="flex items-center gap-1.5 text-sm">
              <Tag class="h-4 w-4" />
              Tags
            </Label>
            <Input
              id="edit-tags"
              v-model="form.tags"
              placeholder="Adicionar tags (separadas por vírgula)"
            />
          </div>

          <!-- Prioridade + Origem -->
          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-1.5">
              <Label class="flex items-center gap-1.5 text-sm">
                <Target class="h-4 w-4" />
                Prioridade
              </Label>
              <Select v-model="form.prioridade">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Médio</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Label for="edit-origem" class="flex items-center gap-1.5 text-sm">
                <Target class="h-4 w-4" />
                Origem
              </Label>
              <Input
                id="edit-origem"
                v-model="form.origem"
                placeholder="Como nos encontrou?"
              />
            </div>
          </div>

          <!-- Observações -->
          <div class="space-y-1.5">
            <Label for="edit-obs" class="flex items-center gap-1.5 text-sm">
              <MessageSquare class="h-4 w-4" />
              Observações
            </Label>
            <textarea
              id="edit-obs"
              v-model="form.observacao"
              rows="3"
              class="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              placeholder="Informações adicionais sobre o lead..."
            />
          </div>

          <p
            v-if="errorMsg"
            class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {{ errorMsg }}
          </p>

          <div class="flex justify-end pt-2">
            <Button
              type="submit"
              :disabled="saving"
              class="gap-1 bg-emerald-500 text-white hover:bg-emerald-600"
            >
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              {{ saving ? 'Atualizando...' : 'Atualizar' }}
            </Button>
          </div>
        </form>
      </div>
    </DialogScrollContent>
  </Dialog>
</template>
