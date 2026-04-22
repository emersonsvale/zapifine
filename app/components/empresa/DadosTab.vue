<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'

const { company, canEdit, updateCompany, pending } = useCompany()

const form = reactive({
  name: '',
  descricao_empresa: '',
  phone: '',
  email_empresa: '',
  cep_empresa: '',
  rua_empresa: '',
  numero_empresa: '',
  bairro_empresa: '',
  cidade_empresa: '',
  estado_empresa: '',
  business_hours: '',
  site_empresa: '',
  cnpj: '',
})

watch(
  company,
  (c) => {
    if (!c) return
    form.name = c.name ?? ''
    form.descricao_empresa = c.descricao_empresa ?? ''
    form.phone = c.phone ?? ''
    form.email_empresa = c.email_empresa ?? ''
    form.cep_empresa = c.cep_empresa ?? ''
    form.rua_empresa = c.rua_empresa ?? ''
    form.numero_empresa = c.numero_empresa ?? ''
    form.bairro_empresa = c.bairro_empresa ?? ''
    form.cidade_empresa = c.cidade_empresa ?? ''
    form.estado_empresa = c.estado_empresa ?? ''
    form.business_hours = c.business_hours ?? ''
    form.site_empresa = c.site_empresa ?? ''
    form.cnpj = c.cnpj ?? ''
  },
  { immediate: true },
)

const saving = ref(false)
const message = ref<{ kind: 'ok' | 'err'; text: string } | null>(null)

const disabled = computed(() => !canEdit.value || pending.value)

async function save() {
  message.value = null
  saving.value = true
  try {
    await updateCompany({
      name: form.name.trim(),
      descricao_empresa: form.descricao_empresa.trim() || null,
      phone: form.phone.trim() || null,
      email_empresa: form.email_empresa.trim() || null,
      cep_empresa: form.cep_empresa.trim() || null,
      rua_empresa: form.rua_empresa.trim() || null,
      numero_empresa: form.numero_empresa.trim() || null,
      bairro_empresa: form.bairro_empresa.trim() || null,
      cidade_empresa: form.cidade_empresa.trim() || null,
      estado_empresa: form.estado_empresa.trim() || null,
      business_hours: form.business_hours.trim() || null,
      site_empresa: form.site_empresa.trim() || null,
      cnpj: form.cnpj.trim() || null,
    })
    message.value = { kind: 'ok', text: 'Dados salvos.' }
  } catch (err) {
    message.value = {
      kind: 'err',
      text: err instanceof Error ? err.message : 'Falha ao salvar.',
    }
  } finally {
    saving.value = false
  }
}

defineExpose({ save, saving })
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-2xl">Dados da Empresa</CardTitle>
      <CardDescription>
        Configure os detalhes da sua empresa para personalizar as respostas do chatbot.
      </CardDescription>
    </CardHeader>

    <CardContent>
      <form class="space-y-5" @submit.prevent="save">
        <div class="space-y-1.5">
          <Label for="emp-name">Nome da Empresa</Label>
          <Input
            id="emp-name"
            v-model="form.name"
            :disabled="disabled"
            required
          />
        </div>

        <div class="space-y-1.5">
          <Label for="emp-desc">Descrição da Empresa</Label>
          <textarea
            id="emp-desc"
            v-model="form.descricao_empresa"
            rows="4"
            :disabled="disabled"
            class="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="O que sua empresa faz, público-alvo, diferenciais"
          />
        </div>

        <div class="grid gap-5 md:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="emp-phone">Telefone</Label>
            <Input
              id="emp-phone"
              v-model="form.phone"
              :disabled="disabled"
              placeholder="(00) 00000-0000"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="emp-email">E-mail para contato</Label>
            <Input
              id="emp-email"
              v-model="form.email_empresa"
              type="email"
              :disabled="disabled"
              placeholder="contato@empresa.com"
            />
          </div>
        </div>

        <div class="grid gap-5 md:grid-cols-[1fr_2fr_1fr]">
          <div class="space-y-1.5">
            <Label for="emp-cep">CEP</Label>
            <Input id="emp-cep" v-model="form.cep_empresa" :disabled="disabled" />
          </div>
          <div class="space-y-1.5">
            <Label for="emp-rua">Rua</Label>
            <Input id="emp-rua" v-model="form.rua_empresa" :disabled="disabled" />
          </div>
          <div class="space-y-1.5">
            <Label for="emp-num">Número</Label>
            <Input
              id="emp-num"
              v-model="form.numero_empresa"
              :disabled="disabled"
            />
          </div>
        </div>

        <div class="grid gap-5 md:grid-cols-3">
          <div class="space-y-1.5">
            <Label for="emp-bairro">Bairro</Label>
            <Input
              id="emp-bairro"
              v-model="form.bairro_empresa"
              :disabled="disabled"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="emp-cidade">Cidade</Label>
            <Input
              id="emp-cidade"
              v-model="form.cidade_empresa"
              :disabled="disabled"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="emp-estado">Estado</Label>
            <Input
              id="emp-estado"
              v-model="form.estado_empresa"
              :disabled="disabled"
              placeholder="UF"
              maxlength="2"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <Label for="emp-hours">Horário de Funcionamento</Label>
          <textarea
            id="emp-hours"
            v-model="form.business_hours"
            rows="2"
            :disabled="disabled"
            class="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Seg a Sex: 9h às 18h | Sáb: 9h às 13h"
          />
        </div>

        <div class="grid gap-5 md:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="emp-site">Website</Label>
            <Input
              id="emp-site"
              v-model="form.site_empresa"
              :disabled="disabled"
              placeholder="https://empresa.com"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="emp-cnpj">CNPJ</Label>
            <Input
              id="emp-cnpj"
              v-model="form.cnpj"
              :disabled="disabled"
              placeholder="00.000.000/0000-00"
            />
          </div>
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

        <div>
          <Button type="submit" :disabled="saving || disabled">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            Salvar alterações
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</template>
