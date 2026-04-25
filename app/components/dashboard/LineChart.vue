<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  labels: string[]
  values: number[]
  height?: number
  color?: string
  fillOpacity?: number
  yFormatter?: (v: number) => string
  yMaxOverride?: number
}>()

const W = 600
const H = computed(() => props.height ?? 180)
const PADX = 32
const PADY = 16

const yMax = computed(() => {
  if (props.yMaxOverride != null) return props.yMaxOverride
  const m = Math.max(0, ...(props.values ?? []))
  if (m === 0) return 1
  // arredonda pra cima em uma unidade "boa"
  const pow = 10 ** Math.floor(Math.log10(m))
  return Math.ceil((m * 1.1) / pow) * pow
})

const points = computed(() => {
  const vals = props.values ?? []
  if (vals.length === 0) return [] as Array<{ x: number; y: number; v: number; label: string }>
  const innerW = W - PADX * 2
  const innerH = H.value - PADY * 2
  const stepX = vals.length > 1 ? innerW / (vals.length - 1) : 0
  return vals.map((v, i) => {
    const x = PADX + (vals.length === 1 ? innerW / 2 : i * stepX)
    const y = PADY + innerH - (v / yMax.value) * innerH
    return { x, y, v, label: props.labels?.[i] ?? '' }
  })
})

const linePath = computed(() => {
  const pts = points.value
  if (pts.length === 0) return ''
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
})

const areaPath = computed(() => {
  const pts = points.value
  if (pts.length === 0) return ''
  const innerH = H.value - PADY
  const first = pts[0]!
  const last = pts[pts.length - 1]!
  const top = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
  return `${top} L${last.x.toFixed(1)},${innerH} L${first.x.toFixed(1)},${innerH} Z`
})

const yTicks = computed(() => {
  const max = yMax.value
  return [0, max / 2, max]
})

const color = computed(() => props.color ?? '#10b981')
const fillOpacity = computed(() => props.fillOpacity ?? 0.18)

function formatY(v: number) {
  return props.yFormatter ? props.yFormatter(v) : String(Math.round(v))
}
</script>

<template>
  <div class="w-full">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      preserveAspectRatio="none"
      class="w-full"
      :style="{ height: H + 'px' }"
    >
      <!-- Grid Y -->
      <g>
        <line
          v-for="t in yTicks"
          :key="t"
          :x1="PADX"
          :x2="W - PADX"
          :y1="PADY + (H - PADY * 2) - (t / yMax) * (H - PADY * 2)"
          :y2="PADY + (H - PADY * 2) - (t / yMax) * (H - PADY * 2)"
          stroke="currentColor"
          stroke-opacity="0.08"
          stroke-dasharray="3 3"
        />
        <text
          v-for="t in yTicks"
          :key="`l-${t}`"
          :x="PADX - 6"
          :y="PADY + (H - PADY * 2) - (t / yMax) * (H - PADY * 2) + 3"
          text-anchor="end"
          font-size="9"
          fill="currentColor"
          fill-opacity="0.5"
        >
          {{ formatY(t) }}
        </text>
      </g>

      <!-- Area + linha -->
      <path :d="areaPath" :fill="color" :fill-opacity="fillOpacity" />
      <path :d="linePath" :stroke="color" stroke-width="2" fill="none" />

      <!-- Pontos -->
      <g>
        <circle
          v-for="(p, i) in points"
          :key="i"
          :cx="p.x"
          :cy="p.y"
          r="3"
          :fill="color"
        >
          <title>{{ p.label }}: {{ formatY(p.v) }}</title>
        </circle>
      </g>

      <!-- Labels X -->
      <g>
        <text
          v-for="(p, i) in points"
          :key="`x-${i}`"
          :x="p.x"
          :y="H - 2"
          text-anchor="middle"
          font-size="10"
          fill="currentColor"
          fill-opacity="0.6"
        >
          {{ p.label }}
        </text>
      </g>
    </svg>
  </div>
</template>
