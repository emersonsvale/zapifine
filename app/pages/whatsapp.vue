<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ArrowLeft,
  Smartphone,
  WifiOff,
  QrCode,
  ShieldCheck,
} from 'lucide-vue-next'

useHead({ title: 'Conectar WhatsApp - Zapifine' })

const { connection, isConnected, provider } = useWhatsappConnection()

const active = ref<'whatsapp_evolution' | 'whatsapp_cloud'>('whatsapp_evolution')

watch(
  provider,
  (p) => {
    active.value = p
  },
  { immediate: true },
)

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
})

function formatLastConnection(iso: string | null | undefined) {
  return iso ? dateFmt.format(new Date(iso)) : '—'
}

const providerLabel = computed(() =>
  connection.value?.provider === 'whatsapp_cloud' ? 'Cloud API' : 'Evolution Go',
)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <Button variant="outline" size="icon" @click="navigateTo('/dashboard')">
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <h1 class="text-3xl font-semibold tracking-tight">Conectar WhatsApp</h1>
    </div>

    <div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <Tabs v-model="active" class="gap-4">
        <TabsList class="h-11 p-1">
          <TabsTrigger value="whatsapp_evolution" class="px-4">
            <QrCode class="h-4 w-4" />
            Evolution Go
          </TabsTrigger>
          <TabsTrigger value="whatsapp_cloud" class="px-4">
            <ShieldCheck class="h-4 w-4" />
            Cloud API (Oficial)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp_evolution">
          <WhatsappEvolutionPanel />
        </TabsContent>
        <TabsContent value="whatsapp_cloud">
          <WhatsappCloudApiPanel />
        </TabsContent>
      </Tabs>

      <!-- Side: última conexão -->
      <Card class="h-fit">
        <CardHeader>
          <CardTitle class="text-xl">Última Conexão</CardTitle>
          <CardDescription>Provedor: {{ providerLabel }}</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full"
                :class="
                  isConnected
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-muted text-muted-foreground'
                "
              >
                <Smartphone v-if="isConnected" class="h-5 w-5" />
                <WifiOff v-else class="h-5 w-5" />
              </div>
              <div>
                <p class="text-sm font-medium">
                  {{ formatLastConnection(connection?.last_connected_at) }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ connection?.phone_number ?? 'Sem número' }}
                </p>
              </div>
            </div>
            <Badge :variant="isConnected ? 'default' : 'secondary'">
              {{ isConnected ? 'Ativo' : 'Inativo' }}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
