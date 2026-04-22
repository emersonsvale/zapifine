<script setup lang="ts">
import { ref } from 'vue'
import { Settings, FileText } from 'lucide-vue-next'

useHead({ title: 'Lembretes de Atendimento - Zapifine' })

const tab = ref<'config' | 'templates'>('config')
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight">
        Lembretes de Atendimento
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Defina como e quando os lembretes serão enviados aos seus clientes
      </p>
    </div>

    <Tabs v-model="tab" class="gap-6">
      <TabsList class="h-10 p-1">
        <TabsTrigger value="config" class="px-4">
          <Settings class="h-4 w-4" />
          Configurações
        </TabsTrigger>
        <TabsTrigger value="templates" class="px-4">
          <FileText class="h-4 w-4" />
          Templates
        </TabsTrigger>
      </TabsList>

      <TabsContent value="config">
        <LembretesConfigTab />
      </TabsContent>
      <TabsContent value="templates">
        <LembretesTemplatesTab />
      </TabsContent>
    </Tabs>
  </div>
</template>
