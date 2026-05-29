<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Eye, EyeOff, Loader2 } from 'lucide-vue-next'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Definir senha - Zapifine' })

const supabase = useSupabaseClient()

const flow = ref<'invite' | 'recovery'>('recovery')
onMounted(() => {
  if (typeof window === 'undefined') return
  if (window.location.hash.includes('type=invite')) flow.value = 'invite'
})
const heading = computed(() =>
  flow.value === 'invite' ? 'Crie sua senha de acesso' : 'Defina sua nova senha',
)
const submitLabel = computed(() =>
  flow.value === 'invite' ? 'Criar senha' : 'Redefinir senha',
)
const successCopy = computed(() =>
  flow.value === 'invite'
    ? 'Senha criada! Redirecionando para o login...'
    : 'Senha redefinida! Redirecionando para o login...',
)

const form = reactive({ password: '', confirm: '' })
const touched = reactive({ password: false, confirm: false })

const showPassword = ref(false)
const showConfirm = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const errors = computed(() => ({
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
  touched.password = true
  touched.confirm = true
}

async function handleReset() {
  errorMsg.value = ''
  successMsg.value = ''
  markAll()
  if (hasErrors.value) return

  loading.value = true
  try {
    const { error } = await supabase.auth.updateUser({
      password: form.password,
    })
    if (error) {
      errorMsg.value = error.message
      return
    }
    successMsg.value = successCopy.value
    setTimeout(() => navigateTo('/login'), 1500)
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : 'Falha ao redefinir senha.'
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

    <h1 class="mb-6 text-[15px] font-medium">{{ heading }}</h1>

    <form class="space-y-5" novalidate @submit.prevent="handleReset">
      <div class="space-y-1.5">
        <Label for="password">Nova senha</Label>
        <div class="relative">
          <Input
            id="password"
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Nova senha"
            autocomplete="new-password"
            class="h-11 pr-10"
            :aria-invalid="touched.password && !!errors.password || undefined"
            @blur="touched.password = true"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
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
            class="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
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
      >
        {{ errorMsg }}
      </p>
      <p
        v-if="successMsg"
        class="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary"
      >
        {{ successMsg }}
      </p>

      <Button type="submit" :disabled="loading" class="w-full" size="lg">
        <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
        {{ loading ? 'Salvando...' : submitLabel }}
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
