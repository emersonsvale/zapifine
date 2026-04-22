<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Loader2, Bot as BotIcon, MessageSquareHeart, Upload } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type BotRow = Database['public']['Tables']['bots']['Row']

useHead({ title: 'Personalização do bot - Zapifine' })

const { bot, updateBot, canEdit, pending } = useBot()

const tab = ref<'perfil' | 'estilo'>('perfil')

const form = reactive<{
  name: string
  descricao: string
  status: BotRow['status']
  language_style: string
  comprimento_respostas: string
  uso_emoji: boolean
  uso_abreviacoes: boolean
  welcome_message: string
  away_message: string
  roteiro_atendimento: string
}>({
  name: '',
  descricao: '',
  status: 'Online',
  language_style: 'Profissional',
  comprimento_respostas: 'Conciso',
  uso_emoji: false,
  uso_abreviacoes: false,
  welcome_message: '',
  away_message: '',
  roteiro_atendimento: '',
})

watch(
  bot,
  (b) => {
    if (!b) return
    form.name = b.name ?? ''
    form.descricao = b.descricao ?? ''
    form.status = b.status === 'Ausente' ? 'Offline' : b.status ?? 'Online'
    form.language_style = b.language_style ?? 'Profissional'
    form.comprimento_respostas = b.comprimento_respostas ?? 'Conciso'
    form.uso_emoji = !!b.uso_emoji
    form.uso_abreviacoes = !!b.uso_abreviacoes
    form.welcome_message = b.welcome_message ?? ''
    form.away_message = b.away_message ?? ''
    form.roteiro_atendimento = b.roteiro_atendimento ?? ''
  },
  { immediate: true },
)

const saving = ref(false)
const message = ref<{ kind: 'ok' | 'err'; text: string } | null>(null)

const iaAtiva = computed(() => !!bot.value?.ia_ativa)
const togglingIa = ref(false)
async function onToggleIa() {
  if (!canEdit.value || pending.value || togglingIa.value) return
  const next = !iaAtiva.value
  togglingIa.value = true
  message.value = null
  try {
    await updateBot({ ia_ativa: next })
    message.value = {
      kind: 'ok',
      text: next ? 'IA ativada.' : 'IA desativada.',
    }
  } catch (err) {
    message.value = {
      kind: 'err',
      text: err instanceof Error ? err.message : 'Falha ao alternar IA.',
    }
  } finally {
    togglingIa.value = false
  }
}

async function save() {
  message.value = null
  saving.value = true
  try {
    await updateBot({
      name: form.name.trim() || null,
      descricao: form.descricao.trim() || null,
      status: form.status,
      language_style: form.language_style,
      comprimento_respostas: form.comprimento_respostas,
      uso_emoji: form.uso_emoji,
      uso_abreviacoes: form.uso_abreviacoes,
      welcome_message: form.welcome_message.trim() || null,
      away_message: form.away_message.trim() || null,
      roteiro_atendimento: form.roteiro_atendimento.trim() || null,
    })
    message.value = { kind: 'ok', text: 'Alterações salvas.' }
  } catch (err) {
    message.value = {
      kind: 'err',
      text: err instanceof Error ? err.message : 'Falha ao salvar.',
    }
  } finally {
    saving.value = false
  }
}

const toneOptions = [
  {
    value: 'Profissional',
    label: 'Profissional',
    description:
      'Linguagem formal e profissional para ambientes corporativos',
  },
  {
    value: 'Amigável',
    label: 'Amigável',
    description: 'Tom casual e acessível, ideal para a maioria dos negócios',
  },
  {
    value: 'Casual',
    label: 'Casual',
    description: 'Linguagem bem descontraída com uso de gírias e emojis',
  },
]

const lengthOptions = [
  {
    value: 'Conciso',
    label: 'Conciso',
    description: 'Respostas curtas e diretas ao ponto',
  },
  {
    value: 'Equilibrado',
    label: 'Equilibrado',
    description: 'Respostas com informações relevantes sem exageros',
  },
  {
    value: 'Detalhado',
    label: 'Detalhado',
    description: 'Respostas completas com informações detalhadas',
  },
]

const disabled = computed(() => !canEdit.value || pending.value)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">
          Personalização do Atendente
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Configure como seu chatbot se apresenta e conversa com os clientes.
        </p>
      </div>
      <Button :disabled="saving || disabled" @click="save">
        <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
        Salvar alterações
      </Button>
    </div>

    <p
      v-if="message"
      class="rounded-md border px-3 py-2 text-sm"
      :class="
        message.kind === 'ok'
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-destructive/30 bg-destructive/10 text-destructive'
      "
    >
      {{ message.text }}
    </p>

    <p
      v-if="!canEdit"
      class="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300"
    >
      Apenas o dono da conta pode editar o atendente.
    </p>

    <Card>
      <CardContent class="flex flex-wrap items-center justify-between gap-4 py-4">
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full"
            :class="iaAtiva ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'"
          >
            <BotIcon class="h-5 w-5" />
          </div>
          <div>
            <p class="text-sm font-semibold">
              Atendimento por IA
              <span
                class="ml-2 rounded px-2 py-0.5 text-[11px] font-medium"
                :class="
                  iaAtiva
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
                "
              >
                {{ iaAtiva ? 'Ativo' : 'Desativado' }}
              </span>
            </p>
            <p class="text-xs text-muted-foreground">
              Chave geral do bot. Quando desligado, nenhuma conversa é respondida pela IA.
            </p>
          </div>
        </div>
        <label class="relative inline-flex shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            class="peer sr-only"
            :checked="iaAtiva"
            :disabled="!canEdit || pending || togglingIa"
            @change="onToggleIa"
          />
          <span
            class="h-7 w-12 rounded-full bg-muted transition-colors peer-checked:bg-primary peer-disabled:opacity-60"
          />
          <span
            class="absolute left-1 top-1 h-5 w-5 rounded-full bg-background shadow transition-transform peer-checked:translate-x-5"
          />
          <Loader2
            v-if="togglingIa"
            class="absolute -right-6 h-4 w-4 animate-spin text-muted-foreground"
          />
        </label>
      </CardContent>
    </Card>

    <Tabs v-model="tab" class="gap-6">
      <TabsList class="grid h-11 w-full grid-cols-2 p-1">
        <TabsTrigger value="perfil">
          <BotIcon class="h-4 w-4" />
          Perfil do Bot
        </TabsTrigger>
        <TabsTrigger value="estilo">
          <MessageSquareHeart class="h-4 w-4" />
          Estilo de Linguagem
        </TabsTrigger>
      </TabsList>

      <!-- Perfil -->
      <TabsContent value="perfil">
        <Card>
          <CardHeader>
            <CardTitle class="text-2xl">Perfil do Chatbot</CardTitle>
            <CardDescription>
              Configure como seu chatbot será apresentado aos clientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="grid gap-8 md:grid-cols-[auto_1fr]">
              <!-- Avatar -->
              <div class="flex flex-col items-center gap-3">
                <p class="text-sm font-medium">Perfil WhatsApp</p>
                <Avatar class="h-28 w-28">
                  <AvatarFallback
                    class="bg-gradient-to-br from-emerald-400 to-cyan-500 text-zinc-950"
                  >
                    <BotIcon class="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  :disabled="disabled"
                >
                  <Upload class="h-3.5 w-3.5" />
                  Alterar Avatar
                </Button>
              </div>

              <div class="space-y-5">
                <div class="space-y-1.5">
                  <Label for="bot-name">Nome do Atendente</Label>
                  <Input
                    id="bot-name"
                    v-model="form.name"
                    placeholder="Ex: LivIA"
                    :disabled="disabled"
                  />
                </div>

                <div class="space-y-1.5">
                  <Label for="bot-desc">Descrição</Label>
                  <textarea
                    id="bot-desc"
                    v-model="form.descricao"
                    rows="3"
                    :disabled="disabled"
                    class="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Quem é o atendente, papel e personalidade"
                  />
                </div>

                <div class="space-y-1.5">
                  <Label for="bot-status">Status do Bot</Label>
                  <Select v-model="form.status" :disabled="disabled">
                    <SelectTrigger id="bot-status" class="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Online">Online</SelectItem>
                      <SelectItem value="Offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Estilo -->
      <TabsContent value="estilo">
        <Card>
          <CardHeader>
            <CardTitle class="text-2xl">Estilo de Linguagem</CardTitle>
            <CardDescription>
              Defina como seu chatbot se comunica com os clientes.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-8">
            <!-- Tom de Comunicação (inline radios) -->
            <div class="space-y-3">
              <h3 class="text-sm font-semibold">Tom de Comunicação</h3>
              <div class="grid gap-4 md:grid-cols-3">
                <label
                  v-for="opt in toneOptions"
                  :key="opt.value"
                  class="flex cursor-pointer gap-3"
                >
                  <input
                    v-model="form.language_style"
                    type="radio"
                    :value="opt.value"
                    name="tone"
                    :disabled="disabled"
                    class="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  />
                  <div class="min-w-0">
                    <p class="text-sm font-medium">{{ opt.label }}</p>
                    <p class="mt-0.5 text-xs text-muted-foreground">
                      {{ opt.description }}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <!-- Comprimento -->
            <div class="space-y-3">
              <h3 class="text-sm font-semibold">Comprimento das Respostas</h3>
              <div class="grid gap-4 md:grid-cols-3">
                <label
                  v-for="opt in lengthOptions"
                  :key="opt.value"
                  class="flex cursor-pointer gap-3"
                >
                  <input
                    v-model="form.comprimento_respostas"
                    type="radio"
                    :value="opt.value"
                    name="length"
                    :disabled="disabled"
                    class="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  />
                  <div class="min-w-0">
                    <p class="text-sm font-medium">{{ opt.label }}</p>
                    <p class="mt-0.5 text-xs text-muted-foreground">
                      {{ opt.description }}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <!-- Toggles row -->
            <div>
              <div class="flex items-center justify-between gap-4 border-y py-4">
                <div>
                  <p class="text-sm font-medium">Uso de Emojis</p>
                  <p class="text-xs text-muted-foreground">
                    Permitir que o chatbot utilize emojis nas respostas.
                  </p>
                </div>
                <label class="relative inline-flex shrink-0 cursor-pointer items-center">
                  <input
                    v-model="form.uso_emoji"
                    type="checkbox"
                    class="peer sr-only"
                    :disabled="disabled"
                  />
                  <span
                    class="h-6 w-11 rounded-full bg-muted transition-colors peer-checked:bg-primary"
                  />
                  <span
                    class="absolute left-1 top-1 h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-5"
                  />
                </label>
              </div>

              <div class="flex items-center justify-between gap-4 border-b py-4">
                <div>
                  <p class="text-sm font-medium">Uso de abreviações</p>
                  <p class="text-xs text-muted-foreground">
                    Permitir o uso de abreviações comuns como "vc", "tbm", etc.
                  </p>
                </div>
                <label class="relative inline-flex shrink-0 cursor-pointer items-center">
                  <input
                    v-model="form.uso_abreviacoes"
                    type="checkbox"
                    class="peer sr-only"
                    :disabled="disabled"
                  />
                  <span
                    class="h-6 w-11 rounded-full bg-muted transition-colors peer-checked:bg-primary"
                  />
                  <span
                    class="absolute left-1 top-1 h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-5"
                  />
                </label>
              </div>
            </div>

            <!-- Textareas -->
            <div class="space-y-1.5">
              <Label for="bot-welcome">Mensagem de Saudação</Label>
              <textarea
                id="bot-welcome"
                v-model="form.welcome_message"
                rows="3"
                :disabled="disabled"
                class="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div class="space-y-1.5">
              <Label for="bot-away">Mensagem de Ausência</Label>
              <textarea
                id="bot-away"
                v-model="form.away_message"
                rows="4"
                :disabled="disabled"
                class="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div class="space-y-1.5">
              <Label for="bot-roteiro">
                Estrutura de atendimento ou roteiro de atendimento
              </Label>
              <textarea
                id="bot-roteiro"
                v-model="form.roteiro_atendimento"
                rows="8"
                :disabled="disabled"
                class="flex w-full rounded-md border bg-transparent px-3 py-2 font-mono text-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
