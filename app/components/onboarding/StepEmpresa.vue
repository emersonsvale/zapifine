<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'

const emit = defineEmits<{ (e: 'next'): void }>()

const { company, updateCompany } = useCompany()

const form = reactive({
  name: '',
  phone: '',
  cep_empresa: '',
  rua_empresa: '',
  numero_empresa: '',
  bairro_empresa: '',
  cidade_empresa: '',
  estado_empresa: '',
  business_hours: 'Segunda a Sexta: 9h às 18h | Sábado: 9h às 13h',
})

watch(
  company,
  (c) => {
    if (!c) return
    form.name = c.name ?? ''
    form.phone = c.phone ?? ''
    form.cep_empresa = c.cep_empresa ?? ''
    form.rua_empresa = c.rua_empresa ?? ''
    form.numero_empresa = c.numero_empresa ?? ''
    form.bairro_empresa = c.bairro_empresa ?? ''
    form.cidade_empresa = c.cidade_empresa ?? ''
    form.estado_empresa = c.estado_empresa ?? ''
    form.business_hours = c.business_hours ?? form.business_hours
  },
  { immediate: true },
)

const saving = ref(false)
const errorMsg = ref('')

async function save() {
  errorMsg.value = ''
  saving.value = true
  try {
    await updateCompany({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      cep_empresa: form.cep_empresa.trim() || null,
      rua_empresa: form.rua_empresa.trim() || null,
      numero_empresa: form.numero_empresa.trim() || null,
      bairro_empresa: form.bairro_empresa.trim() || null,
      cidade_empresa: form.cidade_empresa.trim() || null,
      estado_empresa: form.estado_empresa.trim() || null,
      business_hours: form.business_hours.trim() || null,
    })
    emit('next')
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : 'Falha ao salvar empresa.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold">Informações da Empresa</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Preencha as informações básicas da sua empresa para personalizar seu
        atendimento.
      </p>
    </div>

    <form class="space-y-5" @submit.prevent="save">
      <div class="space-y-1.5">
        <Label for="ob-name">Nome da Empresa</Label>
        <Input id="ob-name" v-model="form.name" required />
      </div>

      <div class="space-y-1.5">
        <Label for="ob-phone">Telefone</Label>
        <Input id="ob-phone" v-model="form.phone" />
      </div>

      <div class="grid gap-4 md:grid-cols-[1fr_2fr_1fr]">
        <div class="space-y-1.5">
          <Label for="ob-cep">CEP</Label>
          <Input id="ob-cep" v-model="form.cep_empresa" />
        </div>
        <div class="space-y-1.5">
          <Label for="ob-rua">Rua</Label>
          <Input id="ob-rua" v-model="form.rua_empresa" />
        </div>
        <div class="space-y-1.5">
          <Label for="ob-num">Número</Label>
          <Input id="ob-num" v-model="form.numero_empresa" />
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <div class="space-y-1.5">
          <Label for="ob-bairro">Bairro</Label>
          <Input id="ob-bairro" v-model="form.bairro_empresa" />
        </div>
        <div class="space-y-1.5">
          <Label for="ob-cidade">Cidade</Label>
          <Input id="ob-cidade" v-model="form.cidade_empresa" />
        </div>
        <div class="space-y-1.5">
          <Label for="ob-estado">Estado</Label>
          <Input
            id="ob-estado"
            v-model="form.estado_empresa"
            maxlength="2"
            placeholder="UF"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <Label for="ob-hours">Horário de Funcionamento</Label>
        <textarea
          id="ob-hours"
          v-model="form.business_hours"
          rows="2"
          class="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      <p
        v-if="errorMsg"
        class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {{ errorMsg }}
      </p>

      <div class="flex justify-end">
        <Button type="submit" :disabled="saving">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          Salvar e Continuar
        </Button>
      </div>
    </form>
  </div>
</template>
