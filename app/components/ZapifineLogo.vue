<script setup lang="ts">
withDefaults(
  defineProps<{
    /** height in px of the full logo (logo + text) */
    size?: number
    /** use only the mark (icon), no text */
    iconOnly?: boolean
  }>(),
  { size: 40, iconOnly: false },
)
</script>

<template>
  <img
    v-if="iconOnly"
    src="/logo.svg"
    :style="{ height: `${size}px`, width: `${size}px` }"
    alt="Zapifine"
    class="object-contain"
  />
  <img
    v-else
    src="/zapifine_logo_completa.png"
    :style="{ height: `${size}px` }"
    alt="Zapifine"
    class="object-contain w-auto"
    draggable="false"
  />
</template>
