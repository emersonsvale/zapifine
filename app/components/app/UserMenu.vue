<script setup lang="ts">
import { computed, ref } from 'vue'
import { Settings, LogOut, ChevronDown } from 'lucide-vue-next'
import { publicAssetUrl } from '~/lib/utils'

const supabase = useSupabaseClient()
const authUser = useSupabaseUser()
const { data: currentUser } = useCurrentUser()

const displayName = computed(() => {
  const u = currentUser.value
  return u?.nome?.trim() || u?.email || authUser.value?.email || 'Visitante'
})

const email = computed(
  () => currentUser.value?.email ?? authUser.value?.email ?? '',
)

const initials = computed(() =>
  displayName.value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'Z',
)

const avatarBroken = ref(false)
const avatarUrl = computed(() =>
  avatarBroken.value ? null : publicAssetUrl(currentUser.value?.foto_perfil),
)

async function signOut() {
  await supabase.auth.signOut()
  await navigateTo('/login', { replace: true })
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :title="displayName"
      >
        <Avatar class="h-11 w-11">
          <AvatarImage
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="displayName"
            @error="avatarBroken = true"
          />
          <AvatarFallback
            class="bg-gradient-to-br from-emerald-400 to-cyan-500 text-sm font-semibold text-zinc-950"
          >
            {{ initials }}
          </AvatarFallback>
        </Avatar>
        <ChevronDown class="h-4 w-4 text-muted-foreground" />
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" class="w-64">
      <DropdownMenuLabel class="font-normal">
        <div class="flex flex-col gap-0.5">
          <span class="text-xs uppercase tracking-wider text-muted-foreground">
            Minha Conta
          </span>
          <span class="truncate text-sm font-medium">{{ displayName }}</span>
          <span v-if="email" class="truncate text-xs text-muted-foreground">
            {{ email }}
          </span>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem as-child>
        <NuxtLink to="/configuracoes" class="cursor-pointer">
          <Settings class="h-4 w-4" />
          Configurações
        </NuxtLink>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem class="text-destructive focus:text-destructive" @select="signOut">
        <LogOut class="h-4 w-4" />
        Sair
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
