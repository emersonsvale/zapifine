<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Loader2, MessageSquareText } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

useHead({ title: 'Multiatendimento - Configurações' })

const supabase = useSupabaseClient<Database>()
const authUser = useSupabaseUser()
const { data: currentUser, refresh } = useCurrentUser()

const nome = ref('')
const cargoChat = ref('')
const saving = ref(false)
const message = ref<{ kind: 'ok' | 'err'; text: string } | null>(null)

watch(
  currentUser,
  (u) => {
    if (!u) return
    nome.value = u.nome ?? ''
    cargoChat.value = (u as { cargo_chat?: string | null }).cargo_chat ?? ''
  },
  { immediate: true },
)

const preview = computed(() => {
  const n = nome.value.trim()
  const c = cargoChat.value.trim()
  if (!n || !c) return null
  return `*${n} - ${c}*`
})

async function handleSave() {
  if (!authUser.value?.id) return
  message.value = null
  saving.value = true
  try {
    const { error } = await supabase
      .from('users')
      .update({
        nome: nome.value.trim() || null,
        cargo_chat: cargoChat.value.trim() || null,
      })
      .eq('id', authUser.value.id)
    if (error) throw error
    await refresh()
    message.value = { kind: 'ok', text: 'Alterações salvas.' }
  } catch (err) {
    message.value = {
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
    <div>
      <h1 class="text-3xl font-semibold tracking-tight">
        Configurações do Multiatendimento
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Personalize como suas mensagens aparecem no chat do cliente.
      </p>
    </div>

    <Card>
      <CardHeader>
        <div class="flex items-center gap-2">
          <MessageSquareText class="h-5 w-5 text-primary" />
          <CardTitle class="text-xl">Assinatura do atendente</CardTitle>
        </div>
        <CardDescription>
          Quando você enviar uma mensagem pelo chat, ela será prefixada com seu
          nome e cargo em negrito. Exemplo:
          <span class="font-medium text-foreground">*Emerson - Atendimento*</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form class="space-y-6" @submit.prevent="handleSave">
          <div class="grid gap-6 md:grid-cols-2">
            <div class="space-y-1.5">
              <Label for="chat-nome">Nome</Label>
              <Input
                id="chat-nome"
                v-model="nome"
                placeholder="Ex.: Emerson"
              />
              <p class="text-xs text-muted-foreground">
                Mesmo nome usado no seu perfil.
              </p>
            </div>
            <div class="space-y-1.5">
              <Label for="chat-cargo">Cargo</Label>
              <Input
                id="chat-cargo"
                v-model="cargoChat"
                placeholder="Ex.: Atendimento"
              />
              <p class="text-xs text-muted-foreground">
                Deixe em branco para não prefixar mensagens.
              </p>
            </div>
          </div>

          <div class="space-y-1.5">
            <Label>Pré-visualização</Label>
            <div
              class="flex justify-end rounded-md border bg-muted/30 p-4"
            >
              <div
                class="max-w-[75%] rounded-lg bg-emerald-600/90 px-3 py-2 text-sm text-white shadow-sm"
              >
                <p
                  v-if="preview"
                  class="whitespace-pre-wrap break-words font-semibold"
                >
                  {{ preview }}
                </p>
                <p class="whitespace-pre-wrap break-words">
                  Olá! Em que posso ajudar?
                </p>
              </div>
            </div>
            <p v-if="!preview" class="text-xs text-muted-foreground">
              Preencha nome e cargo para habilitar o prefixo.
            </p>
          </div>

          <p
            v-if="message"
            class="rounded-md border px-3 py-2 text-sm"
            :class="
              message.kind === 'ok'
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            "
            role="status"
          >
            {{ message.text }}
          </p>

          <div>
            <Button type="submit" :disabled="saving">
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              {{ saving ? 'Salvando...' : 'Salvar Alterações' }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
