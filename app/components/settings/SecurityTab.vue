<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Loader2, Eye, EyeOff } from 'lucide-vue-next'

const supabase = useSupabaseClient()
const authUser = useSupabaseUser()

const form = reactive({ current: '', next: '', confirm: '' })
const touched = reactive({ current: false, next: false, confirm: false })

const showCurrent = ref(false)
const showNext = ref(false)
const showConfirm = ref(false)

const saving = ref(false)
const message = ref<{ kind: 'ok' | 'err'; text: string } | null>(null)

const errors = computed(() => ({
  current: !form.current ? 'Obrigatório' : '',
  next: !form.next
    ? 'Obrigatório'
    : form.next.length < 6
      ? 'Mínimo de 6 caracteres'
      : '',
  confirm: !form.confirm
    ? 'Obrigatório'
    : form.confirm !== form.next
      ? 'Senhas não conferem'
      : '',
}))

const hasErrors = computed(() =>
  Object.values(errors.value).some(Boolean),
)

function markAll() {
  touched.current = true
  touched.next = true
  touched.confirm = true
}

async function handleChange() {
  markAll()
  message.value = null
  if (hasErrors.value) return
  if (!authUser.value?.email) {
    message.value = { kind: 'err', text: 'Sessão inválida.' }
    return
  }

  saving.value = true
  try {
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: authUser.value.email,
      password: form.current,
    })
    if (reauthErr) {
      message.value = { kind: 'err', text: 'Senha atual incorreta.' }
      return
    }

    const { error: updErr } = await supabase.auth.updateUser({
      password: form.next,
    })
    if (updErr) {
      message.value = { kind: 'err', text: updErr.message }
      return
    }

    form.current = ''
    form.next = ''
    form.confirm = ''
    touched.current = false
    touched.next = false
    touched.confirm = false
    message.value = { kind: 'ok', text: 'Senha alterada com sucesso.' }
  } catch (err) {
    message.value = {
      kind: 'err',
      text: err instanceof Error ? err.message : 'Falha ao alterar senha.',
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-2xl">Segurança da Conta</CardTitle>
      <CardDescription>Atualize suas credenciais de segurança.</CardDescription>
    </CardHeader>
    <CardContent>
      <form class="space-y-5" novalidate @submit.prevent="handleChange">
        <div class="space-y-1.5">
          <Label for="sec-current">Senha Atual</Label>
          <div class="relative">
            <Input
              id="sec-current"
              v-model="form.current"
              :type="showCurrent ? 'text' : 'password'"
              placeholder="Senha atual"
              autocomplete="current-password"
              class="pr-10"
              :aria-invalid="touched.current && !!errors.current || undefined"
              @blur="touched.current = true"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              :aria-label="showCurrent ? 'Ocultar' : 'Mostrar'"
              @click="showCurrent = !showCurrent"
            >
              <EyeOff v-if="showCurrent" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>
          </div>
          <p
            v-if="touched.current && errors.current"
            class="text-xs text-destructive"
          >
            {{ errors.current }}
          </p>
        </div>

        <div class="grid gap-5 md:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="sec-next">Nova Senha</Label>
            <div class="relative">
              <Input
                id="sec-next"
                v-model="form.next"
                :type="showNext ? 'text' : 'password'"
                placeholder="Nova senha"
                autocomplete="new-password"
                class="pr-10"
                :aria-invalid="touched.next && !!errors.next || undefined"
                @blur="touched.next = true"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                :aria-label="showNext ? 'Ocultar' : 'Mostrar'"
                @click="showNext = !showNext"
              >
                <EyeOff v-if="showNext" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </button>
            </div>
            <p
              v-if="touched.next && errors.next"
              class="text-xs text-destructive"
            >
              {{ errors.next }}
            </p>
          </div>

          <div class="space-y-1.5">
            <Label for="sec-confirm">Confirme a Nova Senha</Label>
            <div class="relative">
              <Input
                id="sec-confirm"
                v-model="form.confirm"
                :type="showConfirm ? 'text' : 'password'"
                placeholder="Confirme a senha"
                autocomplete="new-password"
                class="pr-10"
                :aria-invalid="touched.confirm && !!errors.confirm || undefined"
                @blur="touched.confirm = true"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                :aria-label="showConfirm ? 'Ocultar' : 'Mostrar'"
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
          <Button type="submit" :disabled="saving">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            {{ saving ? 'Salvando...' : 'Alterar senha' }}
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</template>
