<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  src: string
  type: 'image' | 'video'
  alt?: string
}>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const dragging = ref(false)
const dragStart = ref({ x: 0, y: 0, tx: 0, ty: 0 })

const MIN_SCALE = 1
const MAX_SCALE = 6
const STEP = 0.25

function reset() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

function close() {
  emit('update:open', false)
}

function zoomIn() {
  scale.value = Math.min(MAX_SCALE, +(scale.value + STEP).toFixed(2))
}
function zoomOut() {
  const next = Math.max(MIN_SCALE, +(scale.value - STEP).toFixed(2))
  scale.value = next
  if (next === 1) {
    translateX.value = 0
    translateY.value = 0
  }
}

function onWheel(e: WheelEvent) {
  if (props.type !== 'image') return
  e.preventDefault()
  const delta = -e.deltaY
  const factor = delta > 0 ? 1.1 : 0.9
  const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale.value * factor))
  if (newScale === scale.value) return
  const ratio = newScale / scale.value
  translateX.value = translateX.value * ratio
  translateY.value = translateY.value * ratio
  scale.value = newScale
  if (newScale === 1) {
    translateX.value = 0
    translateY.value = 0
  }
}

function onMouseDown(e: MouseEvent) {
  if (props.type !== 'image' || scale.value <= 1) return
  dragging.value = true
  dragStart.value = {
    x: e.clientX,
    y: e.clientY,
    tx: translateX.value,
    ty: translateY.value,
  }
}
function onMouseMove(e: MouseEvent) {
  if (!dragging.value) return
  translateX.value = dragStart.value.tx + (e.clientX - dragStart.value.x)
  translateY.value = dragStart.value.ty + (e.clientY - dragStart.value.y)
}
function onMouseUp() {
  dragging.value = false
}

function onDoubleClick() {
  if (props.type !== 'image') return
  if (scale.value > 1) {
    reset()
  } else {
    scale.value = 2.5
  }
}

function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) close()
}

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') close()
  else if (e.key === '+' || e.key === '=') zoomIn()
  else if (e.key === '-' || e.key === '_') zoomOut()
  else if (e.key === '0') reset()
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      reset()
      window.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
    } else {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})

const imageStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  cursor:
    scale.value > 1 ? (dragging.value ? 'grabbing' : 'grab') : 'zoom-in',
  transition: dragging.value ? 'none' : 'transform 0.15s ease-out',
}))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      @click="onBackdropClick"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
    >
      <div
        class="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-full bg-black/50 p-1 text-white"
      >
        <button
          v-if="type === 'image'"
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15"
          title="Diminuir (-)"
          @click.stop="zoomOut"
        >
          <ZoomOut class="h-5 w-5" />
        </button>
        <span
          v-if="type === 'image'"
          class="min-w-[3rem] text-center text-xs tabular-nums opacity-80"
        >
          {{ Math.round(scale * 100) }}%
        </span>
        <button
          v-if="type === 'image'"
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15"
          title="Ampliar (+)"
          @click.stop="zoomIn"
        >
          <ZoomIn class="h-5 w-5" />
        </button>
        <button
          v-if="type === 'image'"
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15"
          title="Resetar (0)"
          @click.stop="reset"
        >
          <RotateCcw class="h-5 w-5" />
        </button>
        <a
          :href="src"
          target="_blank"
          rel="noopener"
          download
          class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15"
          title="Baixar"
          @click.stop
        >
          <Download class="h-5 w-5" />
        </a>
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15"
          title="Fechar (Esc)"
          @click.stop="close"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div
        class="flex h-full w-full items-center justify-center overflow-hidden p-4"
        @wheel="onWheel"
      >
        <img
          v-if="type === 'image'"
          :src="src"
          :alt="alt ?? 'Imagem'"
          class="max-h-full max-w-full select-none object-contain"
          :style="imageStyle"
          draggable="false"
          @mousedown="onMouseDown"
          @dblclick="onDoubleClick"
          @click.stop
        />
        <video
          v-else
          :src="src"
          controls
          autoplay
          class="max-h-full max-w-full rounded bg-black"
          @click.stop
        />
      </div>
    </div>
  </Teleport>
</template>
