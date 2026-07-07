<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { VueFlow, useVueFlow, MarkerType, type NodeTypesObject } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { ArrowLeft, Save, Send, Loader2 } from 'lucide-vue-next'
import type { FlowGraph, FlowTriggerType } from '~/composables/useFlows'
import FlowNodeCard from '~/components/flow-builder/FlowNodeCard.vue'
import NodePalette from '~/components/flow-builder/NodePalette.vue'
import NodeInspector from '~/components/flow-builder/NodeInspector.vue'
import TriggerConfigEditor from '~/components/flow-builder/TriggerConfigEditor.vue'
import { getNodeMeta } from '~/components/flow-builder/node-catalog'
import { useFlowBuilderOptions } from '~/composables/useFlowBuilderOptions'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

useHead({ title: 'Editor de Fluxo - Zapifine' })

const route = useRoute()
const router = useRouter()
const flowId = computed(() => route.params.id as string)

const { flow, pending, saving, load, save, publish } = useFlow(flowId)

const TRIGGER_LABELS: Record<FlowTriggerType, string> = {
  lead_new_message: 'Lead novo enviou mensagem',
  lead_archived_message: 'Lead arquivado enviou mensagem',
  lead_in_service_message: 'Lead em atendimento enviou mensagem',
  lead_column_changed: 'Lead mudou de coluna',
  manual_chat: 'Disparo manual',
}

const flowName = ref('')
const triggerType = ref<FlowTriggerType>('lead_new_message')
const triggerConfig = ref<Record<string, unknown>>({})

const builderOptions = useFlowBuilderOptions()
const optionsForInspector = computed(() => ({
  columns: builderOptions.columns.value,
  users: builderOptions.users.value,
  tags: builderOptions.tags.value,
  flows: builderOptions.flows.value,
}))

type VfNode = {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label?: string
    nodeType: string
    summary?: string
    config: Record<string, unknown>
  }
}
type VfEdge = {
  id: string
  source: string
  target: string
  markerEnd?: string
}

const nodes = ref<VfNode[]>([])
const edges = ref<VfEdge[]>([])
const selectedId = ref<string | null>(null)
const errorMsg = ref<string | null>(null)
const info = ref<string | null>(null)

const {
  onConnect,
  addEdges,
  applyNodeChanges,
  applyEdgeChanges,
  project,
  vueFlowRef,
} = useVueFlow()

const canvasWrapper = ref<HTMLElement | null>(null)

function summarize(nodeType: string, cfg: Record<string, unknown>): string {
  if (nodeType === 'send_text' && typeof cfg.text === 'string' && cfg.text) {
    return String(cfg.text).slice(0, 80)
  }
  if (nodeType === 'wait_delay' && cfg.seconds != null) {
    return `Aguardar ${cfg.seconds}s`
  }
  if (nodeType === 'wait_reply') {
    return `Var: ${cfg.variable ?? 'reply'} — timeout ${cfg.timeout_seconds ?? 86400}s`
  }
  if (nodeType === 'condition') {
    const branches = Array.isArray((cfg as { branches?: unknown[] }).branches)
      ? (cfg as { branches: unknown[] }).branches.length
      : 0
    return `${branches} ramo(s)`
  }
  return ''
}

function graphToVueFlow(graph: FlowGraph): { nodes: VfNode[]; edges: VfEdge[] } {
  const vfNodes: VfNode[] = graph.nodes.map((n, i) => ({
    id: n.id,
    type: 'flowNode',
    position: n.position ?? { x: 80 + i * 40, y: 80 + i * 120 },
    data: {
      label: n.label,
      nodeType: n.type,
      summary: summarize(n.type, n.config ?? {}),
      config: (n.config ?? {}) as Record<string, unknown>,
    },
  }))
  const vfEdges: VfEdge[] = graph.edges.map((e, i) => ({
    id: `e-${e.from}-${e.to}-${i}`,
    source: e.from,
    target: e.to,
    markerEnd: MarkerType.ArrowClosed,
  }))
  return { nodes: vfNodes, edges: vfEdges }
}

function vueFlowToGraph(): FlowGraph {
  return {
    nodes: nodes.value.map((n) => ({
      id: n.id,
      type: n.data.nodeType,
      label: n.data.label,
      position: n.position,
      config: n.data.config,
      next: null,
    })),
    edges: edges.value.map((e) => ({ from: e.source, to: e.target })),
  }
}

onMounted(async () => {
  try {
    await Promise.all([load(), builderOptions.load(flowId.value)])
  } catch (e) {
    errorMsg.value = (e as Error).message
    return
  }
  if (!flow.value) return
  flowName.value = flow.value.name
  triggerType.value = flow.value.trigger_type
  triggerConfig.value = (flow.value.trigger_config ?? {}) as Record<string, unknown>
  const graph = flow.value.graph ?? { nodes: [], edges: [] }
  if (graph.nodes.length === 0) {
    // Seed com trigger
    const triggerId = crypto.randomUUID()
    nodes.value = [
      {
        id: triggerId,
        type: 'flowNode',
        position: { x: 240, y: 40 },
        data: { label: 'Gatilho', nodeType: 'trigger', config: {}, summary: '' },
      },
    ]
    edges.value = []
  } else {
    const conv = graphToVueFlow(graph)
    nodes.value = conv.nodes
    edges.value = conv.edges
  }
})

watch(flow, (f) => {
  if (!f) return
  if (flowName.value === '') flowName.value = f.name
})

onConnect((params) => {
  addEdges([{ ...params, markerEnd: MarkerType.ArrowClosed }])
})

function onNodesChange(changes: unknown[]) {
  applyNodeChanges(changes as never)
}
function onEdgesChange(changes: unknown[]) {
  applyEdgeChanges(changes as never)
}
function onNodeClick({ node }: { node: { id: string } }) {
  selectedId.value = node.id
}
function onPaneClick() {
  selectedId.value = null
}

function onCanvasDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}

function onCanvasDrop(e: DragEvent) {
  e.preventDefault()
  const type = e.dataTransfer?.getData('application/flow-node-type')
  if (!type) return
  const meta = getNodeMeta(type)
  if (!meta) return
  const bounds = (vueFlowRef.value as HTMLElement | null)?.getBoundingClientRect()
  const point = project({
    x: e.clientX - (bounds?.left ?? 0),
    y: e.clientY - (bounds?.top ?? 0),
  })
  const newNode: VfNode = {
    id: crypto.randomUUID(),
    type: 'flowNode',
    position: point,
    data: {
      label: meta.label,
      nodeType: type,
      config: { ...meta.defaultConfig },
      summary: '',
    },
  }
  nodes.value = [...nodes.value, newNode]
  nextTick(() => (selectedId.value = newNode.id))
}

const graphNodesForInspector = computed(() =>
  nodes.value.map((n) => ({
    id: n.id,
    label: n.data.label ?? '',
    type: n.data.nodeType,
  })),
)

const selectedNode = computed(() => {
  if (!selectedId.value) return null
  const n = nodes.value.find((x) => x.id === selectedId.value)
  if (!n) return null
  return { id: n.id, type: n.data.nodeType, data: n.data }
})

function onNodeUpdate(id: string, patch: { label?: string; config?: Record<string, unknown> }) {
  nodes.value = nodes.value.map((n) => {
    if (n.id !== id) return n
    const nextConfig = patch.config ?? n.data.config
    return {
      ...n,
      data: {
        ...n.data,
        label: patch.label !== undefined ? patch.label : n.data.label,
        config: nextConfig,
        summary: summarize(n.data.nodeType, nextConfig),
      },
    }
  })
}

function onNodeRemove(id: string) {
  nodes.value = nodes.value.filter((n) => n.id !== id)
  edges.value = edges.value.filter((e) => e.source !== id && e.target !== id)
  if (selectedId.value === id) selectedId.value = null
}

async function onSave() {
  errorMsg.value = null
  info.value = null
  try {
    await save({
      name: flowName.value.trim() || 'Sem nome',
      trigger_type: triggerType.value,
      trigger_config: triggerConfig.value,
      graph: vueFlowToGraph(),
    })
    info.value = 'Salvo.'
    setTimeout(() => (info.value = null), 2000)
  } catch (e) {
    errorMsg.value = (e as Error).message
  }
}

async function onPublish() {
  errorMsg.value = null
  info.value = null
  try {
    await save({
      name: flowName.value.trim() || 'Sem nome',
      trigger_type: triggerType.value,
      trigger_config: triggerConfig.value,
      graph: vueFlowToGraph(),
    })
    const v = await publish()
    if (v) info.value = `Publicado v${v}.`
    setTimeout(() => (info.value = null), 2500)
  } catch (e) {
    errorMsg.value = (e as Error).message
  }
}

const nodeTypes = { flowNode: FlowNodeCard } as unknown as NodeTypesObject
</script>

<template>
  <div class="flex h-[calc(100vh-3.5rem)] flex-col">
    <div class="flex items-center gap-3 border-b bg-background px-4 py-2">
      <Button variant="ghost" size="icon" @click="router.push('/automacoes/fluxos')">
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <Input v-model="flowName" class="max-w-xs" placeholder="Nome do fluxo" />
      <Select v-model="triggerType">
        <SelectTrigger class="max-w-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="(label, key) in TRIGGER_LABELS" :key="key" :value="key">
            {{ label }}
          </SelectItem>
        </SelectContent>
      </Select>
      <TriggerConfigEditor
        v-if="triggerType === 'lead_column_changed'"
        class="min-w-[280px] max-w-md"
        :trigger-type="triggerType"
        :config="triggerConfig"
        :columns="builderOptions.columns.value"
        @update="triggerConfig = $event"
      />
      <div v-if="flow" class="text-xs text-muted-foreground">
        {{ flow.status === 'published' ? `Publicado v${flow.published_version}` : 'Rascunho' }}
      </div>
      <div class="flex-1" />
      <div v-if="info" class="text-xs text-emerald-600">{{ info }}</div>
      <div v-if="errorMsg" class="text-xs text-red-600">{{ errorMsg }}</div>
      <Button variant="outline" :disabled="saving" @click="onSave">
        <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
        <Save v-else class="h-4 w-4" />
        Salvar
      </Button>
      <Button :disabled="saving" @click="onPublish">
        <Send class="h-4 w-4" />
        Publicar
      </Button>
    </div>

    <div v-if="pending" class="flex flex-1 items-center justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
    <div v-else class="grid flex-1 grid-cols-[220px_1fr_300px] overflow-hidden">
      <aside class="border-r bg-muted/30">
        <NodePalette />
      </aside>

      <div
        ref="canvasWrapper"
        class="relative"
        @dragover="onCanvasDragOver"
        @drop="onCanvasDrop"
      >
        <VueFlow
          :nodes="nodes"
          :edges="edges"
          :node-types="nodeTypes"
          :fit-view-on-init="true"
          :default-viewport="{ x: 0, y: 0, zoom: 0.9 }"
          @nodes-change="onNodesChange"
          @edges-change="onEdgesChange"
          @node-click="onNodeClick"
          @pane-click="onPaneClick"
        >
          <Background pattern-color="#aaa" :gap="16" />
          <Controls />
          <MiniMap pannable zoomable />
        </VueFlow>
      </div>

      <aside class="border-l bg-muted/30">
        <NodeInspector
          :node="selectedNode"
          :options="optionsForInspector"
          :graph-nodes="graphNodesForInspector"
          @update="onNodeUpdate"
          @remove="onNodeRemove"
        />
      </aside>
    </div>
  </div>
</template>
