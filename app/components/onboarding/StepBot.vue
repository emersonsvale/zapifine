<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'

const emit = defineEmits<{ (e: 'next'): void }>()

const { bot, updateBot } = useBot()

const toneOptions = [
  {
    value: 'Profissional',
    label: 'Profissional',
    description: 'Linguagem formal para ambientes corporativos',
  },
  {
    value: 'Amigável',
    label: 'Amigável',
    description: 'Tom casual e acessível, ideal para a maioria',
  },
  {
    value: 'Casual',
    label: 'Casual',
    description: 'Descontraído com uso de gírias e emojis',
  },
  {
    value: 'Técnico',
    label: 'Técnico',
    description: 'Respostas precisas e baseadas em dados',
  },
]

const form = reactive({
  name: 'Assistente Virtual',
  language_style: 'Profissional',
  welcome_message: 'Olá! Sou o assistente virtual da sua empresa. Como posso ajudar?',
  away_message:
    'Estamos fora do horário de expediente. Retornaremos seu contato em breve.',
})

watch(
  bot,
  (b) => {
    if (!b) return
    form.name = b.name ?? form.name
    form.language_style = b.language_style ?? form.language_style
    form.welcome_message = b.welcome_message ?? form.welcome_message
    form.away_message = b.away_message ?? form.away_message
  },
  { immediate: true },
)

const saving = ref(false)
const errorMsg = ref('')

async function save() {
  errorMsg.value = ''
  if (!form.name.trim()) {
    errorMsg.value = 'Informe o nome do atendente.'
    return
  }
  if (!form.welcome_message.trim() || !form.away_message.trim()) {
    errorMsg.value = 'Preencha as mensagens de saudação e ausência.'
    return
  }
  saving.value = true
  try {
    await updateBot({
      name: form.name.trim(),
      language_style: form.language_style,
      welcome_message: form.welcome_message.trim(),
      away_message: form.away_message.trim(),
    })
    emit('next')
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : 'Falha ao salvar bot.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold">Personalização do Bot</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Configure como seu assistente virtual irá se comunicar com seus
        clientes.
      </p>
    </div>

    <form class="space-y-5" @submit.prevent="save">
      <div class="space-y-1.5">
        <Label for="ob-botname">
          Nome do Atendente Virtual <span class="text-destructive">*</span>
        </Label>
        <Input id="ob-botname" v-model="form.name" required />
      </div>

      <div class="space-y-2">
        <Label>Tom de Comunicação</Label>
        <div class="space-y-2">
          <label
            v-for="opt in toneOptions"
            :key="opt.value"
            class="flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition hover:bg-accent/30"
            :class="
              form.language_style === opt.value ? 'border-primary' : ''
            "
          >
            <input
              v-model="form.language_style"
              type="radio"
              name="ob-tone"
              :value="opt.value"
              class="mt-1 h-4 w-4 shrink-0 accent-primary"
            />
            <div>
              <p class="text-sm font-medium">{{ opt.label }}</p>
              <p class="text-xs text-muted-foreground">{{ opt.description }}</p>
            </div>
          </label>
        </div>
      </div>

      <div class="space-y-1.5">
        <Label for="ob-welcome">
          Mensagem de Boas-vindas <span class="text-destructive">*</span>
        </Label>
        <textarea
          id="ob-welcome"
          v-model="form.welcome_message"
          rows="3"
          class="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      <div class="space-y-1.5">
        <Label for="ob-away">
          Mensagem de Ausência <span class="text-destructive">*</span>
        </Label>
        <textarea
          id="ob-away"
          v-model="form.away_message"
          rows="3"
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
