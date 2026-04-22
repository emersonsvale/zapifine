<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Eye, EyeOff, Loader2 } from 'lucide-vue-next'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Criar conta - Zapifine' })

const supabase = useSupabaseClient()

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirm: '',
})

const touched = reactive({
  name: false,
  email: false,
  password: false,
  confirm: false,
})

const showPassword = ref(false)
const showConfirm = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const errors = computed(() => ({
  name: !form.name ? 'Obrigatório' : '',
  email: !form.email
    ? 'Obrigatório'
    : !emailRegex.test(form.email)
      ? 'E-mail inválido'
      : '',
  password: !form.password
    ? 'Obrigatório'
    : form.password.length < 6
      ? 'Mínimo de 6 caracteres'
      : '',
  confirm: !form.confirm
    ? 'Obrigatório'
    : form.confirm !== form.password
      ? 'Senhas não conferem'
      : '',
}))

const hasErrors = computed(() =>
  Object.values(errors.value).some(Boolean),
)

function markAll() {
  touched.name = true
  touched.email = true
  touched.password = true
  touched.confirm = true
}

async function handleRegister() {
  errorMsg.value = ''
  successMsg.value = ''
  markAll()
  if (hasErrors.value) return

  loading.value = true
  try {
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name } },
    })
    if (error) {
      errorMsg.value = error.message
      return
    }
    successMsg.value =
      'Conta criada! Confira seu e-mail para confirmar o cadastro.'
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Falha ao registrar.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-10 flex items-end gap-3">
      <ZapifineLogo :size="40" />
    </div>

    <h1 class="mb-6 text-[15px] font-medium">Registre-se na Zapifine</h1>

    <form class="space-y-5" novalidate @submit.prevent="handleRegister">
      <div class="space-y-1.5">
        <Label for="name">Seu nome</Label>
        <Input
          id="name"
          v-model="form.name"
          placeholder="Seu nome"
          autocomplete="name"
          :aria-invalid="touched.name && !!errors.name || undefined"
          class="h-11"
          @blur="touched.name = true"
        />
        <p v-if="touched.name && errors.name" class="text-xs text-destructive">
          {{ errors.name }}
        </p>
      </div>

      <div class="space-y-1.5">
        <Label for="email">E-mail</Label>
        <Input
          id="email"
          v-model="form.email"
          type="email"
          placeholder="E-mail"
          autocomplete="email"
          :aria-invalid="touched.email && !!errors.email || undefined"
          class="h-11"
          @blur="touched.email = true"
        />
        <p v-if="touched.email && errors.email" class="text-xs text-destructive">
          {{ errors.email }}
        </p>
      </div>

      <div class="space-y-1.5">
        <Label for="password">Senha</Label>
        <div class="relative">
          <Input
            id="password"
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Senha"
            autocomplete="new-password"
            class="h-11 pr-10"
            :aria-invalid="touched.password && !!errors.password || undefined"
            @blur="touched.password = true"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
            :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" class="h-4 w-4" />
            <Eye v-else class="h-4 w-4" />
          </button>
        </div>
        <p
          v-if="touched.password && errors.password"
          class="text-xs text-destructive"
        >
          {{ errors.password }}
        </p>
      </div>

      <div class="space-y-1.5">
        <Label for="confirm">Confirmar Senha</Label>
        <div class="relative">
          <Input
            id="confirm"
            v-model="form.confirm"
            :type="showConfirm ? 'text' : 'password'"
            placeholder="Confirmar Senha"
            autocomplete="new-password"
            class="h-11 pr-10"
            :aria-invalid="touched.confirm && !!errors.confirm || undefined"
            @blur="touched.confirm = true"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
            :aria-label="showConfirm ? 'Ocultar senha' : 'Mostrar senha'"
            @click="showConfirm = !showConfirm"
          >
            <EyeOff v-if="showConfirm" class="h-4 w-4" />
            <Eye v-else class="h-4 w-4" />
          </button>
        </div>
        <p
          v-if="touched.confirm && errors.confirm"
          class="text-xs text-destructive"
        >
          {{ errors.confirm }}
        </p>
      </div>

      <p
        v-if="errorMsg"
        class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        role="alert"
      >
        {{ errorMsg }}
      </p>
      <p
        v-if="successMsg"
        class="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary"
        role="status"
      >
        {{ successMsg }}
      </p>

      <Button type="submit" :disabled="loading" class="w-full" size="lg">
        <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
        {{ loading ? 'Criando conta...' : 'Criar conta' }}
      </Button>
    </form>

    <p class="mt-6 text-center text-sm text-muted-foreground">
      Já possui uma conta?
      <NuxtLink
        to="/login"
        class="font-medium text-primary transition-colors hover:text-primary/80"
      >
        Fazer login
      </NuxtLink>
    </p>
  </div>
</template>
