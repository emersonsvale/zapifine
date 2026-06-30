<script setup lang="ts">
import { ArrowLeft, Loader2, Inbox } from 'lucide-vue-next'
import type {
  ChannelConnection,
  ChannelType,
} from '~/composables/useChannelConnections'

useHead({ title: 'Conexões — Zapifine' })

const { connections, refresh, pending, connect, logout, remove, patch } = useChannelConnections()

const showNew = ref(false)
const selectedProvider = ref<ChannelType | null>(null)

const showConnect = ref(false)
const showCloud = ref(false)
const showEdit = ref(false)
const activeConn = ref<ChannelConnection | null>(null)

function handleSelectProvider(p: ChannelType) {
  selectedProvider.value = p
  showNew.value = true
}

function openProviderDialog(conn: ChannelConnection) {
  activeConn.value = conn
  if (conn.provider === 'whatsapp_evolution' || conn.provider === 'whatsapp_uazapi') {
    showConnect.value = true
  } else if (conn.provider === 'whatsapp_cloud') {
    showCloud.value = true
  }
}

async function handleCreated(id: string) {
  await refresh()
  const newConn = connections.value?.find((c) => c.id === id) ?? null
  if (!newConn) return
  openProviderDialog(newConn)
}

async function handleConnect(id: string) {
  const conn = connections.value?.find((c) => c.id === id) ?? null
  if (!conn) return
  openProviderDialog(conn)
}

async function handleLogout(id: string) {
  try {
    await logout(id)
  } catch (err) {
    console.error(err)
  }
}

async function handleRemove(id: string) {
  if (!confirm('Excluir essa conexão? A ação não pode ser desfeita.')) return
  try {
    await remove(id)
  } catch (err) {
    console.error(err)
  }
}

async function handleSetPrincipal(id: string, val: boolean) {
  try {
    await patch(id, { is_principal: val })
  } catch (err) {
    console.error(err)
  }
}

function handleEdit(id: string) {
  activeConn.value = connections.value?.find((c) => c.id === id) ?? null
  if (activeConn.value) showEdit.value = true
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <Button variant="outline" size="icon" @click="navigateTo('/dashboard')">
          <ArrowLeft class="h-4 w-4" />
        </Button>
        <div>
          <h1 class="text-3xl font-semibold tracking-tight">Conexões</h1>
          <p class="text-sm text-muted-foreground">
            Gerencie todas as conexões de atendimento da sua empresa.
          </p>
        </div>
      </div>
      <ConectarNewConnectionMenu @select="handleSelectProvider" />
    </div>

    <div v-if="pending" class="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 class="h-5 w-5 animate-spin" />
    </div>

    <div
      v-else-if="!connections || connections.length === 0"
      class="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground"
    >
      <Inbox class="h-10 w-10 opacity-60" />
      <p class="text-sm">Nenhuma conexão cadastrada.</p>
      <p class="text-xs">Clique em "Nova conexão" pra começar.</p>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <ConectarConnectionCard
        v-for="conn in connections"
        :key="conn.id"
        :conn="conn"
        @connect="handleConnect"
        @logout="handleLogout"
        @remove="handleRemove"
        @set-principal="handleSetPrincipal"
        @edit="handleEdit"
      />
    </div>

    <ConectarNewConnectionDialog
      v-model:open="showNew"
      :provider="selectedProvider"
      @created="handleCreated"
    />
    <ConectarEvolutionConnectDialog
      v-model:open="showConnect"
      :connection="activeConn"
      @connected="refresh"
    />
    <ConectarCloudApiConnectDialog
      v-model:open="showCloud"
      :connection="activeConn"
      @configured="refresh"
    />
    <ConectarEditConnectionDialog
      v-model:open="showEdit"
      :connection="activeConn"
      @saved="refresh"
    />
  </div>
</template>
