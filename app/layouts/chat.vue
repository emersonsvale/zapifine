<template>
  <div class="flex h-screen overflow-hidden bg-background text-foreground">
    <AppSidebar />
    <div class="flex flex-1 flex-col overflow-hidden">
      <AppHeader />
      <main class="flex-1 overflow-hidden">
        <slot />
      </main>
    </div>
    <AppToaster />
    <AppConfirmDialog />
  </div>
</template>
