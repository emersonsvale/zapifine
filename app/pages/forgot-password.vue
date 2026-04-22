<script setup lang="ts">
import { computed, ref } from 'vue'
import { Loader2 } from 'lucide-vue-next'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Recuperar senha - Zapifine' })

const supabase = useSupabaseClient()

const email = ref('')
const touched = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emailError = computed(() => {
  if (!email.value) return 'Obrigatório'
  if (!emailRegex.test(email.value)) return 'E-mail inválido'
  return ''
})

async function handleReset() {
  errorMsg.value = ''
  successMsg.value = ''
  touched.value = true
  if (emailError.value) return

  loading.value = true
  try {
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : undefined
    const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo,
    })
    if (error) {
      errorMsg.value = error.message
      return
    }
    successMsg.value =
      'Enviamos um e-mail com instruções para redefinir sua senha.'
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Falha ao enviar.'
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

    <h1 class="mb-6 text-[15px] font-medium">
      Enviaremos instruções para redefinir sua senha
    </h1>

    <form class="space-y-5" novalidate @submit.prevent="handleReset">
      <div class="space-y-1.5">
        <Label for="email">E-mail</Label>
        <Input
          id="email"
          v-model="email"
          type="email"
          placeholder="nome@empresa.com"
          autocomplete="email"
          class="h-11"
          :aria-invalid="touched && !!emailError || undefined"
          @blur="touched = true"
        />
        <p v-if="touched && emailError" class="text-xs text-destructive">
          {{ emailError }}
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
        {{ loading ? 'Enviando...' : 'Enviar instruções' }}
      </Button>
    </form>

    <p class="mt-6 text-center text-sm">
      <NuxtLink
        to="/login"
        class="font-medium text-primary transition-colors hover:text-primary/80"
      >
        Voltar para login
      </NuxtLink>
    </p>
  </div>
</template>
