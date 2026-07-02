<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { X } from "lucide-vue-next"
import {
  DialogClose,
  DialogContent,
  DialogPortal,
  useForwardPropsEmits,
} from "reka-ui"
import { cn } from "@/lib/utils"
import SheetOverlay from "./SheetOverlay.vue"

defineOptions({ inheritAttrs: false })

type Side = "top" | "bottom" | "left" | "right"

const props = withDefaults(
  defineProps<DialogContentProps & {
    class?: HTMLAttributes["class"]
    side?: Side
    showCloseButton?: boolean
  }>(),
  { side: "right", showCloseButton: true },
)
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = reactiveOmit(props, "class", "side", "showCloseButton")
const forwarded = useForwardPropsEmits(delegatedProps, emits)

const sideClass = {
  right:
    "inset-y-0 right-0 h-full w-full sm:max-w-[600px] border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
  left:
    "inset-y-0 left-0 h-full w-full sm:max-w-[600px] border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
  top:
    "inset-x-0 top-0 w-full border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
  bottom:
    "inset-x-0 bottom-0 w-full border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
} satisfies Record<Side, string>
</script>

<template>
  <DialogPortal>
    <SheetOverlay />
    <DialogContent
      data-slot="sheet-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="cn(
        'fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
        sideClass[props.side],
        props.class,
      )"
    >
      <slot />

      <DialogClose
        v-if="showCloseButton"
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary"
      >
        <X class="h-4 w-4" />
        <span class="sr-only">Fechar</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
