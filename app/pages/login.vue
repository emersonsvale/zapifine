<script setup lang="ts">
import { ref } from 'vue'
import { Eye, EyeOff, Loader2 } from 'lucide-vue-next'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Entrar - Zapifine' })

const supabase = useSupabaseClient()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMsg = ref('')

const version = '0.0.1.27.092025-20 beta'

async function handleSignIn() {
  errorMsg.value = ''
  if (!email.value || !password.value) {
    errorMsg.value = 'Preencha e-mail e senha.'
    return
  }
  loading.value = true
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })
    if (error) {
      errorMsg.value = error.message
      return
    }
    await navigateTo('/')
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Falha ao entrar.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-10 flex items-end gap-3">
      <ZapifineLogo :size="40" />
      <span class="mb-1 text-xs tracking-wide text-muted-foreground">
        {{ version }}
      </span>
    </div>

    <h1 class="mb-6 text-[15px] font-medium">Olá, como é bom ter você aqui!</h1>

    <form class="space-y-5" @submit.prevent="handleSignIn">
      <div class="space-y-1.5">
        <Label for="email">E-mail</Label>
        <Input
          id="email"
          v-model="email"
          type="email"
          placeholder="E-mail"
          autocomplete="email"
          required
          class="h-11"
        />
      </div>

      <div class="space-y-1.5">
        <div class="flex items-center justify-between">
          <Label for="password">Senha</Label>
          <NuxtLink
            to="/forgot-password"
            class="text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            Esqueceu sua senha?
          </NuxtLink>
        </div>
        <div class="relative">
          <Input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Senha"
            autocomplete="current-password"
            required
            class="h-11 pr-10"
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
      </div>

      <p
        v-if="errorMsg"
        class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        role="alert"
      >
        {{ errorMsg }}
      </p>

      <Button type="submit" :disabled="loading" class="w-full" size="lg">
        <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
        {{ loading ? 'Entrando...' : 'Sign In' }}
      </Button>

      <div class="relative my-2">
        <div class="absolute inset-0 flex items-center">
          <span class="w-full border-t border-border" />
        </div>
        <div class="relative flex justify-center text-xs uppercase">
          <span class="bg-background px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      <GoogleAuthButton @error="(m) => (errorMsg = m)" />
    </form>

    <p class="mt-6 text-center text-sm text-muted-foreground">
      Não possui uma conta?
      <NuxtLink
        to="/register"
        class="font-medium text-primary transition-colors hover:text-primary/80"
      >
        Criar conta
      </NuxtLink>
    </p>
  </div>
</template>
