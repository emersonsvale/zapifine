<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'

useHead({ title: 'Follow-up Automático - Zapifine' })

const { config, pending, upsertConfig } = useFollowUp()

type AcaoStr = `${'nada' | 'perdido'}:${'todos' | 'atendentes' | 'visualizadores' | 'admin'}`

const form = reactive({
  ativado: false,
  primeira_chamada: 15,
  mensagem:
    'Olá! Ainda está aí? Estamos à disposição para continuar o atendimento.',
  maximo_chamadas: 2,
  intervalo_chamadas: 5,
  acao: 'perdido' as 'nada' | 'perdido',
  notificar: 'todos' as 'todos' | 'atendentes' | 'visualizadores' | 'admin',
})

function parseAcao(raw: string | null): {
  acao: 'nada' | 'perdido'
  notificar: 'todos' | 'atendentes' | 'visualizadores' | 'admin'
} {
  const def = { acao: 'perdido' as const, notificar: 'todos' as const }
  if (!raw) return def
  const [a, n] = raw.split(':')
  return {
    acao: a === 'nada' ? 'nada' : 'perdido',
    notificar:
      n === 'atendentes' || n === 'visualizadores' || n === 'admin'
        ? n
        : 'todos',
  }
}

watch(
  config,
  (c) => {
    if (!c) return
    form.ativado = !!c.ativado
    form.primeira_chamada = c.primeira_chamada ?? 15
    form.mensagem = c.mensagem ?? form.mensagem
    form.maximo_chamadas = c.maximo_chamadas ?? 2
    form.intervalo_chamadas = c.intervalo_chamadas ?? 5
    const parsed = parseAcao(c.acao)
    form.acao = parsed.acao
    form.notificar = parsed.notificar
  },
  { immediate: true },
)

const saving = ref(false)
const msg = ref<{ kind: 'ok' | 'err'; text: string } | null>(null)

const primeiraLabel = computed(() => {
  const v = form.primeira_chamada
  if (v <= 5) return '5 minutos'
  if (v >= 30) return '30 minutos'
  return `${v} minutos`
})

const pctPrimeira = computed(() => {
  const v = Math.max(5, Math.min(30, form.primeira_chamada))
  return ((v - 5) / (30 - 5)) * 100
})

async function save() {
  msg.value = null
  saving.value = true
  try {
    const acaoStr: AcaoStr = `${form.acao}:${form.notificar}`
    await upsertConfig({
      ativado: form.ativado,
      primeira_chamada: form.primeira_chamada,
      intervalo_chamadas: form.intervalo_chamadas,
      maximo_chamadas: form.maximo_chamadas,
      mensagem: form.mensagem.trim(),
      acao: acaoStr,
    })
    msg.value = { kind: 'ok', text: 'Configurações salvas.' }
  } catch (err) {
    msg.value = {
      kind: 'err',
      text: err instanceof Error ? err.message : 'Falha ao salvar.',
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <h1 class="text-3xl font-semibold tracking-tight">
        Follow-up Automático
      </h1>
      <Button :disabled="saving || pending" @click="save">
        <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
        Salvar alterações
      </Button>
    </div>

    <p
      v-if="msg"
      class="rounded-md border px-3 py-2 text-sm"
      :class="
        msg.kind === 'ok'
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-destructive/30 bg-destructive/10 text-destructive'
      "
    >
      {{ msg.text }}
    </p>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle class="text-2xl">Configurações de Follow-up</CardTitle>
          <CardDescription>
            Configure mensagens automáticas que serão enviadas em caso de
            inatividade do cliente
          </CardDescription>
        </CardHeader>

        <CardContent class="space-y-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold">Ativar Follow-up Automático</p>
              <p class="mt-1 text-xs text-muted-foreground">
                Ative para enviar mensagens automáticas quando o cliente ficar
                inativo
              </p>
            </div>
            <button
              type="button"
              class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
              :class="form.ativado ? 'bg-emerald-500' : 'bg-muted'"
              @click="form.ativado = !form.ativado"
            >
              <span
                class="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
                :class="form.ativado ? 'translate-x-5' : 'translate-x-0.5'"
              />
            </button>
          </div>

          <div class="space-y-2">
            <Label>Intervalo para primeiro Follow-up</Label>
            <div class="flex justify-between text-xs text-muted-foreground">
              <span>5 minutos</span>
              <span>15 minutos</span>
              <span>30 minutos</span>
            </div>
            <input
              v-model.number="form.primeira_chamada"
              type="range"
              min="5"
              max="30"
              step="5"
              class="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted"
              :style="{
                background: `linear-gradient(to right, var(--color-emerald-500, #22c55e) 0%, var(--color-emerald-500, #22c55e) ${pctPrimeira}%, var(--muted, #27272a) ${pctPrimeira}%, var(--muted, #27272a) 100%)`,
              }"
            />
            <p class="text-xs text-muted-foreground">
              O sistema enviará a primeira mensagem após este período de
              inatividade ({{ primeiraLabel }}).
            </p>
          </div>

          <div class="space-y-1.5">
            <Label for="fu-msg">Mensagem de Follow-up</Label>
            <textarea
              id="fu-msg"
              v-model="form.mensagem"
              rows="4"
              class="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          <div class="space-y-1.5">
            <Label for="fu-max">Número máximo de follow-ups</Label>
            <Select v-model="form.maximo_chamadas">
              <SelectTrigger id="fu-max">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="1">1 follow-up</SelectItem>
                <SelectItem :value="2">2 follow-ups</SelectItem>
                <SelectItem :value="3">3 follow-ups</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1.5">
            <Label for="fu-interval">Intervalo entre follow-ups</Label>
            <Select v-model="form.intervalo_chamadas">
              <SelectTrigger id="fu-interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="5">5 minutos</SelectItem>
                <SelectItem :value="10">10 minutos</SelectItem>
                <SelectItem :value="15">15 minutos</SelectItem>
                <SelectItem :value="20">20 minutos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card class="h-fit">
        <CardHeader>
          <CardTitle class="text-xl">Recuperação de Atendimento</CardTitle>
          <CardDescription>
            Configure o que acontece quando um cliente não responde após vários
            follow-ups
          </CardDescription>
        </CardHeader>

        <CardContent class="space-y-5">
          <div class="space-y-3">
            <button
              type="button"
              class="flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition hover:bg-accent/40"
              :class="form.acao === 'nada' ? 'border-primary' : ''"
              @click="form.acao = 'nada'"
            >
              <span
                class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
                :class="
                  form.acao === 'nada'
                    ? 'border-primary'
                    : 'border-muted-foreground'
                "
              >
                <span
                  v-if="form.acao === 'nada'"
                  class="h-2 w-2 rounded-full bg-primary"
                />
              </span>
              <span class="text-sm font-medium">Não fazer nada</span>
            </button>

            <button
              type="button"
              class="flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition hover:bg-accent/40"
              :class="form.acao === 'perdido' ? 'border-primary' : ''"
              @click="form.acao = 'perdido'"
            >
              <span
                class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
                :class="
                  form.acao === 'perdido'
                    ? 'border-primary'
                    : 'border-muted-foreground'
                "
              >
                <span
                  v-if="form.acao === 'perdido'"
                  class="h-2 w-2 rounded-full bg-primary"
                />
              </span>
              <span>
                <span class="block text-sm font-medium">
                  Marcar como perdido
                </span>
                <span class="mt-0.5 block text-xs text-muted-foreground">
                  Registra o atendimento como "perdido" e encerra a conversação
                </span>
              </span>
            </button>
          </div>

          <Separator />

          <div class="space-y-1.5">
            <Label for="fu-notif">Notificar equipe</Label>
            <Select v-model="form.notificar">
              <SelectTrigger id="fu-notif">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Toda equipe</SelectItem>
                <SelectItem value="atendentes">Apenas atendentes</SelectItem>
                <SelectItem value="visualizadores">
                  Apenas visualizadores
                </SelectItem>
                <SelectItem value="admin">Apenas Administradores</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<style scoped>
input[type='range']::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: #10b981;
  border: 2px solid #052e1a;
  cursor: pointer;
}
input[type='range']::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: #10b981;
  border: 2px solid #052e1a;
  cursor: pointer;
}
</style>
