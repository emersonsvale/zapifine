<template>
  <div class="min-h-screen bg-background text-foreground">
    <header class="border-b border-border">
      <div class="mx-auto flex max-w-3xl items-center justify-center px-6 py-5">
        <ZapifineLogo :size="36" />
      </div>
    </header>

    <main class="mx-auto max-w-3xl px-6 py-10">
      <slot />
    </main>
    <AppToaster />
    <AppConfirmDialog />
  </div>
</template>
