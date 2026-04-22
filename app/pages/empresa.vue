<script setup lang="ts">
import { ref } from 'vue'
import { Building2, Package } from 'lucide-vue-next'

useHead({ title: 'Empresa - Zapifine' })

const tab = ref<'dados' | 'produtos'>('dados')
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight">Dados da empresa</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Configure os dados da empresa e o catálogo de produtos/serviços.
      </p>
    </div>

    <Tabs v-model="tab" class="gap-6">
      <TabsList class="h-11 w-full max-w-full grid grid-cols-2 p-1">
        <TabsTrigger value="dados">
          <Building2 class="h-4 w-4" />
          Dados da Empresa
        </TabsTrigger>
        <TabsTrigger value="produtos">
          <Package class="h-4 w-4" />
          Produtos/Serviços
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dados">
        <EmpresaDadosTab />
      </TabsContent>
      <TabsContent value="produtos">
        <EmpresaProdutosTab />
      </TabsContent>
    </Tabs>
  </div>
</template>
