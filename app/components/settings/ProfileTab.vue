<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Loader2, Camera } from 'lucide-vue-next'
import { publicAssetUrl } from '~/lib/utils'
import type { Database } from '~~/types/database'

const supabase = useSupabaseClient<Database>()
const authUser = useSupabaseUser()
const { data: currentUser, refresh } = useCurrentUser()

const nome = ref('')
const empresaNome = ref('')
const empresaTelefone = ref('')
const uploading = ref(false)
const saving = ref(false)
const message = ref<{ kind: 'ok' | 'err'; text: string } | null>(null)

const email = computed(
  () => currentUser.value?.email ?? authUser.value?.email ?? '',
)
const avatarBroken = ref(false)
const avatarUrl = computed(() =>
  avatarBroken.value ? null : publicAssetUrl(currentUser.value?.foto_perfil),
)
const companyId = computed(() => currentUser.value?.companie_id ?? null)
const canEditCompany = computed(
  () => currentUser.value?.funcao_user === 'OWNER',
)

const initials = computed(() =>
  (currentUser.value?.nome ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'Z',
)

watch(
  currentUser,
  (u) => {
    if (!u) return
    nome.value = u.nome ?? ''
    const c = (u as { companies?: { name?: string; phone?: string } | null })
      .companies
    empresaNome.value = c?.name ?? ''
    empresaTelefone.value = c?.phone ?? ''
  },
  { immediate: true },
)

async function handleAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !authUser.value?.id) return
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `avatars/${authUser.value.id}.${ext}`
  uploading.value = true
  message.value = null
  try {
    const { error: upErr } = await supabase.storage
      .from('publics')
      .upload(path, file, { upsert: true, cacheControl: '3600' })
    if (upErr) throw upErr

    const { data: pub } = supabase.storage.from('publics').getPublicUrl(path)
    const rewritten = publicAssetUrl(pub.publicUrl) ?? pub.publicUrl
    const publicUrl = `${rewritten}?v=${Date.now()}`
    avatarBroken.value = false

    const { error: updErr } = await supabase
      .from('users')
      .update({ foto_perfil: publicUrl })
      .eq('id', authUser.value.id)
    if (updErr) throw updErr

    await refresh()
    message.value = { kind: 'ok', text: 'Avatar atualizado.' }
  } catch (err) {
    message.value = {
      kind: 'err',
      text: err instanceof Error ? err.message : 'Falha no upload.',
    }
  } finally {
    uploading.value = false
  }
}

async function handleSave() {
  if (!authUser.value?.id) return
  message.value = null
  saving.value = true
  try {
    const { error: userErr } = await supabase
      .from('users')
      .update({ nome: nome.value.trim() || null })
      .eq('id', authUser.value.id)
    if (userErr) throw userErr

    if (companyId.value && canEditCompany.value) {
      const { error: compErr } = await supabase
        .from('companies')
        .update({
          name: empresaNome.value.trim(),
          phone: empresaTelefone.value.trim() || null,
        })
        .eq('id', companyId.value)
      if (compErr) throw compErr
    }

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
  <Card>
    <CardHeader>
      <CardTitle class="text-2xl">Informações do Perfil</CardTitle>
      <CardDescription>
        Atualize suas informações pessoais e de contato.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <form class="space-y-6" @submit.prevent="handleSave">
        <div class="grid gap-6 md:grid-cols-[auto_1fr_1fr] md:items-start">
          <div class="flex flex-col items-center gap-2">
            <label
              class="group relative block h-24 w-24 cursor-pointer overflow-hidden rounded-full"
            >
              <Avatar class="h-24 w-24">
                <AvatarImage
                  v-if="avatarUrl"
                  :src="avatarUrl"
                  alt="Avatar"
                  @error="avatarBroken = true"
                />
                <AvatarFallback
                  class="bg-gradient-to-br from-emerald-400 to-cyan-500 text-lg font-semibold text-zinc-950"
                >
                  {{ initials }}
                </AvatarFallback>
              </Avatar>
              <span
                class="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Loader2
                  v-if="uploading"
                  class="h-5 w-5 animate-spin text-white"
                />
                <Camera v-else class="h-5 w-5 text-white" />
              </span>
              <input
                type="file"
                accept="image/*"
                class="hidden"
                :disabled="uploading"
                @change="handleAvatarChange"
              />
            </label>
            <span class="text-xs text-muted-foreground">Enviar foto</span>
          </div>

          <div class="space-y-1.5">
            <Label for="profile-name">Nome</Label>
            <Input id="profile-name" v-model="nome" placeholder="Seu nome" />
          </div>

          <div class="space-y-1.5">
            <Label for="profile-email">Email de autenticação</Label>
            <Input id="profile-email" :model-value="email" disabled />
          </div>
        </div>

        <div class="grid gap-6 md:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="profile-company">Empresa</Label>
            <Input
              id="profile-company"
              v-model="empresaNome"
              placeholder="Nome da empresa"
              :disabled="!canEditCompany"
            />
            <p v-if="!canEditCompany" class="text-xs text-muted-foreground">
              Apenas o dono da conta pode editar.
            </p>
          </div>
          <div class="space-y-1.5">
            <Label for="profile-phone">Telefone</Label>
            <Input
              id="profile-phone"
              v-model="empresaTelefone"
              placeholder="(00) 00000-0000"
              :disabled="!canEditCompany"
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
</template>
