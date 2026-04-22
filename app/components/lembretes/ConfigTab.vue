<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { MessageSquare, Mail, Loader2 } from 'lucide-vue-next'

const { config, configPending, templates, upsertConfig } = useLembretes()

const form = reactive({
  ativo: false,
  envio_whatsapp: true,
  envio_email: false,
  primeiro_template_id: '' as string,
  primeiro_lote_tempo: '01:00',
  primeiro_lote_tipo: 'Horas',
  segundo_template_id: '' as string,
  segundo_lote_tempo: '00:10',
  segundo_lote_tipo: 'Minutos',
  cancelamento: true,
})

watch(
  config,
  (c) => {
    if (!c) return
    form.ativo = !!c.ativo
    form.envio_whatsapp = c.envio_whatsapp ?? true
    form.envio_email = !!c.envio_email
    form.primeiro_lote_tempo = c.primeiro_lote_tempo ?? '01:00'
    form.primeiro_lote_tipo = c.primeiro_lote_tipo ?? 'Horas'
    form.segundo_lote_tempo = c.segundo_lote_tempo ?? '00:10'
    form.segundo_lote_tipo = c.segundo_lote_tipo ?? 'Minutos'
    form.cancelamento = c.cancelamento ?? true
  },
  { immediate: true },
)

watch(
  templates,
  (list) => {
    if (!list?.length) return
    if (!form.primeiro_template_id) {
      const t = list.find((x) => x.tipo_lembrete === 'Agendamento')
      if (t) form.primeiro_template_id = String(t.id)
    }
    if (!form.segundo_template_id) {
      const t = list.find((x) => x.tipo_lembrete === 'Confirmação')
      if (t) form.segundo_template_id = String(t.id)
    }
  },
  { immediate: true },
)

const saving = ref(false)
const msg = ref<{ kind: 'ok' | 'err'; text: string } | null>(null)

const tempos = [
  '00:05',
  '00:10',
  '00:15',
  '00:30',
  '01:00',
  '02:00',
  '04:00',
  '12:00',
  '24:00',
]

async function save() {
  msg.value = null
  saving.value = true
  try {
    await upsertConfig({
      ativo: form.ativo,
      envio_whatsapp: form.envio_whatsapp,
      envio_email: form.envio_email,
      primeiro_lote_tempo: form.primeiro_lote_tempo,
      primeiro_lote_tipo: form.primeiro_lote_tipo,
      segundo_lote_tempo: form.segundo_lote_tempo,
      segundo_lote_tipo: form.segundo_lote_tipo,
      cancelamento: form.cancelamento,
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
  <Card>
    <CardHeader>
      <CardTitle class="text-2xl">Configurações de Lembretes</CardTitle>
      <CardDescription>
        Defina como e quando os lembretes serão enviados aos seus clientes
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-6">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm font-semibold">Ativar Lembretes de Atendimento</p>
        </div>
        <button
          type="button"
          class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
          :class="form.ativo ? 'bg-emerald-500' : 'bg-muted'"
          @click="form.ativo = !form.ativo"
        >
          <span
            class="inline-block h-5 w-5 rounded-full bg-white transition-transform"
            :class="form.ativo ? 'translate-x-5' : 'translate-x-0.5'"
          />
        </button>
      </div>

      <div class="space-y-3">
        <p class="text-sm font-semibold">Canais de Envio</p>
        <div class="flex items-center justify-between rounded-lg border px-3 py-2">
          <span class="flex items-center gap-2 text-sm">
            <MessageSquare class="h-4 w-4" />
            WhatsApp
          </span>
          <button
            type="button"
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
            :class="form.envio_whatsapp ? 'bg-emerald-500' : 'bg-muted'"
            @click="form.envio_whatsapp = !form.envio_whatsapp"
          >
            <span
              class="inline-block h-5 w-5 rounded-full bg-white transition-transform"
              :class="form.envio_whatsapp ? 'translate-x-5' : 'translate-x-0.5'"
            />
          </button>
        </div>

        <div class="flex items-center justify-between rounded-lg border px-3 py-2">
          <span class="flex items-center gap-2 text-sm">
            <Mail class="h-4 w-4" />
            E-mail
          </span>
          <button
            type="button"
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
            :class="form.envio_email ? 'bg-emerald-500' : 'bg-muted'"
            @click="form.envio_email = !form.envio_email"
          >
            <span
              class="inline-block h-5 w-5 rounded-full bg-white transition-transform"
              :class="form.envio_email ? 'translate-x-5' : 'translate-x-0.5'"
            />
          </button>
        </div>
      </div>

      <Separator />

      <div class="space-y-4">
        <p class="text-sm font-semibold">Antecedência Padrão dos Lembretes</p>

        <div class="grid gap-6 md:grid-cols-2">
          <div class="space-y-2">
            <Label>Primeiro Lembrete</Label>
            <div class="grid grid-cols-3 gap-2">
              <Select v-model="form.primeiro_template_id">
                <SelectTrigger>
                  <SelectValue placeholder="[primeiro_lembrete]" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="t in templates ?? []"
                    :key="t.id"
                    :value="String(t.id)"
                  >
                    {{ t.titulo ?? `Template #${t.id}` }}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select v-model="form.primeiro_lote_tempo">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="t in tempos" :key="t" :value="t">
                    {{ t }}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select v-model="form.primeiro_lote_tipo">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Horas">Horas</SelectItem>
                  <SelectItem value="Minutos">Minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="space-y-2">
            <Label>Segundo Lembrete</Label>
            <div class="grid grid-cols-3 gap-2">
              <Select v-model="form.segundo_template_id">
                <SelectTrigger>
                  <SelectValue placeholder="[segundo_lembrete]" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="t in templates ?? []"
                    :key="t.id"
                    :value="String(t.id)"
                  >
                    {{ t.titulo ?? `Template #${t.id}` }}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select v-model="form.segundo_lote_tempo">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="t in tempos" :key="t" :value="t">
                    {{ t }}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select v-model="form.segundo_lote_tipo">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Horas">Horas</SelectItem>
                  <SelectItem value="Minutos">Minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div class="flex items-center justify-between gap-4">
        <p class="text-sm font-semibold">Incluir opção de cancelamento</p>
        <button
          type="button"
          class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
          :class="form.cancelamento ? 'bg-emerald-500' : 'bg-muted'"
          @click="form.cancelamento = !form.cancelamento"
        >
          <span
            class="inline-block h-5 w-5 rounded-full bg-white transition-transform"
            :class="form.cancelamento ? 'translate-x-5' : 'translate-x-0.5'"
          />
        </button>
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
    </CardContent>

    <CardFooter class="justify-end">
      <Button :disabled="saving || configPending" @click="save">
        <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
        Salvar alterações
      </Button>
    </CardFooter>
  </Card>
</template>
