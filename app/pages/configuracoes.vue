<script setup lang="ts">
import { ref } from 'vue'
import { User, Users, Lock, Tag } from 'lucide-vue-next'

useHead({ title: 'Configurações - Zapifine' })

const active = ref<'perfil' | 'usuarios' | 'setores' | 'seguranca'>('perfil')
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight">Configurações</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Gerencie suas preferências de conta e configurações do sistema.
      </p>
    </div>

    <Tabs v-model="active" class="gap-6">
      <TabsList class="h-11 p-1">
        <TabsTrigger value="perfil" class="px-4">
          <User class="h-4 w-4" />
          Perfil
        </TabsTrigger>
        <TabsTrigger value="usuarios" class="px-4">
          <Users class="h-4 w-4" />
          Usuários
        </TabsTrigger>
        <TabsTrigger value="setores" class="px-4">
          <Tag class="h-4 w-4" />
          Setores
        </TabsTrigger>
        <TabsTrigger value="seguranca" class="px-4">
          <Lock class="h-4 w-4" />
          Segurança
        </TabsTrigger>
      </TabsList>

      <TabsContent value="perfil">
        <SettingsProfileTab />
      </TabsContent>
      <TabsContent value="usuarios">
        <SettingsUsersTab />
      </TabsContent>
      <TabsContent value="setores">
        <SettingsSetoresTab />
      </TabsContent>
      <TabsContent value="seguranca">
        <SettingsSecurityTab />
      </TabsContent>
    </Tabs>
  </div>
</template>
