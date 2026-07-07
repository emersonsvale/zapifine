<script setup lang="ts">
import { computed } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import { getNodeMeta } from './node-catalog'
import ConditionEditor from './ConditionEditor.vue'
import ButtonsEditor from './ButtonsEditor.vue'
import type {
  FlowColumnOption,
  FlowUserOption,
  FlowFlowOption,
} from '~/composables/useFlowBuilderOptions'

type FlowNodeData = {
  label?: string
  nodeType: string
  config: Record<string, unknown>
}

type BuilderOptions = {
  columns: FlowColumnOption[]
  users: FlowUserOption[]
  tags: string[]
  flows: FlowFlowOption[]
}

type GraphNodeRef = { id: string; label: string; type: string }

const props = defineProps<{
  node: { id: string; type: string; data: FlowNodeData } | null
  options: BuilderOptions
  graphNodes: GraphNodeRef[]
}>()

const emit = defineEmits<{
  update: [id: string, patch: { label?: string; config?: Record<string, unknown> }]
  remove: [id: string]
}>()

const meta = computed(() => (props.node ? getNodeMeta(props.node.data.nodeType) : null))

const waitReplyButtonIdHint = computed(() => {
  const v = String(props.node?.data.config.variable ?? 'reply')
  return `{{${v}_button_id}}`
})

function patchLabel(v: string) {
  if (!props.node) return
  emit('update', props.node.id, { label: v })
}

function patchConfig(patch: Record<string, unknown>) {
  if (!props.node) return
  emit('update', props.node.id, {
    config: { ...props.node.data.config, ...patch },
  })
}

function replaceConfig(next: Record<string, unknown>) {
  if (!props.node) return
  emit('update', props.node.id, { config: next })
}
</script>

<template>
  <div v-if="!node" class="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
    Selecione um nó para editar.
  </div>
  <div v-else class="flex h-full flex-col overflow-y-auto p-4">
    <div class="mb-4 flex items-start justify-between gap-2">
      <div class="flex items-center gap-2">
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white"
          :class="meta?.color ?? 'bg-zinc-500'"
        >
          <component :is="meta?.icon" v-if="meta" class="h-4 w-4" />
        </div>
        <div>
          <div class="text-sm font-semibold">{{ meta?.label ?? node.data.nodeType }}</div>
          <div class="text-[11px] text-muted-foreground">{{ meta?.description }}</div>
        </div>
      </div>
      <Button size="icon" variant="ghost" @click="emit('remove', node.id)">
        <Trash2 class="h-4 w-4 text-red-500" />
      </Button>
    </div>

    <div class="space-y-3">
      <div class="space-y-1">
        <Label class="text-xs">Rótulo</Label>
        <Input :model-value="node.data.label ?? ''" @update:model-value="patchLabel(String($event))" />
      </div>

      <!-- send_text -->
      <template v-if="node.data.nodeType === 'send_text'">
        <div class="space-y-1">
          <Label class="text-xs">Mensagem</Label>
          <textarea
            class="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            :value="String(node.data.config.text ?? '')"
            :placeholder="'Use {{lead.nome}} para variáveis'"
            @input="patchConfig({ text: ($event.target as HTMLTextAreaElement).value })"
          />
          <p class="text-[11px] text-muted-foreground">
            <span v-pre>Variáveis: <code>{{trigger_message}}</code>, <code>{{reply}}</code></span>
          </p>
        </div>
        <div class="space-y-1">
          <Label class="text-xs">Atraso adicional (ms)</Label>
          <Input
            type="number"
            :model-value="node.data.config.delay_ms == null ? '' : Number(node.data.config.delay_ms)"
            placeholder="Ex.: 3000"
            @update:model-value="patchConfig({ delay_ms: $event === '' ? null : Number($event) })"
          />
        </div>
      </template>

      <!-- wait_delay -->
      <template v-if="node.data.nodeType === 'wait_delay'">
        <div class="space-y-1">
          <Label class="text-xs">Segundos</Label>
          <Input
            type="number"
            :model-value="Number(node.data.config.seconds ?? 5)"
            @update:model-value="patchConfig({ seconds: Number($event) })"
          />
        </div>
      </template>

      <!-- wait_reply -->
      <template v-if="node.data.nodeType === 'wait_reply'">
        <div class="space-y-1">
          <Label class="text-xs">Variável (nome)</Label>
          <Input
            :model-value="String(node.data.config.variable ?? 'reply')"
            placeholder="reply"
            @update:model-value="patchConfig({ variable: String($event) })"
          />
          <p class="text-[11px] text-muted-foreground">
            Se o lead clicar em botão, o ID vai em
            <code>{{ waitReplyButtonIdHint }}</code>.
          </p>
        </div>
        <div class="space-y-1">
          <Label class="text-xs">Timeout (segundos)</Label>
          <Input
            type="number"
            :model-value="Number(node.data.config.timeout_seconds ?? 86400)"
            @update:model-value="patchConfig({ timeout_seconds: Number($event) })"
          />
        </div>
      </template>

      <!-- condition (visual editor) -->
      <template v-if="node.data.nodeType === 'condition'">
        <ConditionEditor
          :config="node.data.config as Record<string, unknown>"
          :graph-nodes="graphNodes.filter((n) => n.id !== node!.id)"
          @update="(patch) => replaceConfig({ ...node!.data.config, ...patch })"
        />
      </template>

      <template v-if="node.data.nodeType === 'trigger'">
        <div class="rounded-md bg-amber-50 p-3 text-xs text-amber-900">
          Este nó é o ponto de entrada. Configure o gatilho no topo da página.
        </div>
      </template>

      <template v-if="node.data.nodeType === 'end'">
        <div class="rounded-md bg-zinc-50 p-3 text-xs text-muted-foreground">
          Encerra a execução do fluxo.
        </div>
      </template>

      <!-- send_image / send_audio / send_document / send_video -->
      <template
        v-if="
          node.data.nodeType === 'send_image' ||
          node.data.nodeType === 'send_audio' ||
          node.data.nodeType === 'send_document' ||
          node.data.nodeType === 'send_video'
        "
      >
        <div class="space-y-1">
          <Label class="text-xs">URL do arquivo</Label>
          <Input
            :model-value="String(node.data.config.file_url ?? '')"
            placeholder="https://..."
            @update:model-value="patchConfig({ file_url: String($event) })"
          />
        </div>
        <div class="space-y-1">
          <Label class="text-xs">Nome do arquivo</Label>
          <Input
            :model-value="String(node.data.config.file_name ?? '')"
            @update:model-value="patchConfig({ file_name: String($event) })"
          />
        </div>
        <div v-if="node.data.nodeType !== 'send_audio'" class="space-y-1">
          <Label class="text-xs">Legenda</Label>
          <textarea
            class="min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            :value="String(node.data.config.caption ?? '')"
            @input="patchConfig({ caption: ($event.target as HTMLTextAreaElement).value })"
          />
        </div>
      </template>

      <!-- send_buttons -->
      <template v-if="node.data.nodeType === 'send_buttons'">
        <div class="space-y-1">
          <Label class="text-xs">Mensagem</Label>
          <textarea
            class="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            :value="String(node.data.config.text ?? '')"
            :placeholder="'Escolha uma opção para seu atendimento'"
            @input="patchConfig({ text: ($event.target as HTMLTextAreaElement).value })"
          />
        </div>
        <div class="space-y-1">
          <Label class="text-xs">Rodapé (opcional)</Label>
          <Input
            :model-value="String(node.data.config.footer_text ?? '')"
            placeholder="Rodapé curto"
            @update:model-value="patchConfig({ footer_text: String($event) })"
          />
        </div>
        <ButtonsEditor
          :buttons="node.data.config.buttons"
          @update="(next) => patchConfig({ buttons: next })"
        />
      </template>

      <!-- send_link -->
      <template v-if="node.data.nodeType === 'send_link'">
        <div class="space-y-1">
          <Label class="text-xs">URL</Label>
          <Input
            :model-value="String(node.data.config.url ?? '')"
            placeholder="https://..."
            @update:model-value="patchConfig({ url: String($event) })"
          />
        </div>
        <div class="space-y-1">
          <Label class="text-xs">Texto</Label>
          <textarea
            class="min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            :value="String(node.data.config.text ?? '')"
            @input="patchConfig({ text: ($event.target as HTMLTextAreaElement).value })"
          />
        </div>
      </template>

      <!-- move_column -->
      <template v-if="node.data.nodeType === 'move_column'">
        <div class="space-y-1">
          <Label class="text-xs">Coluna</Label>
          <Select
            :model-value="String(node.data.config.coluna_id ?? '')"
            @update:model-value="patchConfig({ coluna_id: $event ? Number($event) : null })"
          >
            <SelectTrigger><SelectValue placeholder="Selecionar coluna" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="col in options.columns" :key="col.id" :value="String(col.id)">
                {{ col.nome }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </template>

      <!-- tag_add / tag_remove -->
      <template v-if="node.data.nodeType === 'tag_add' || node.data.nodeType === 'tag_remove'">
        <div class="space-y-1">
          <Label class="text-xs">Tag</Label>
          <Input
            :model-value="String(node.data.config.tag ?? '')"
            list="flow-tag-suggestions"
            @update:model-value="patchConfig({ tag: String($event) })"
          />
          <datalist id="flow-tag-suggestions">
            <option v-for="t in options.tags" :key="t" :value="t" />
          </datalist>
        </div>
      </template>

      <!-- assign_user -->
      <template v-if="node.data.nodeType === 'assign_user'">
        <div class="space-y-1">
          <Label class="text-xs">Usuário</Label>
          <Select
            :model-value="String(node.data.config.user_id ?? '')"
            @update:model-value="patchConfig({ user_id: $event ? String($event) : null })"
          >
            <SelectTrigger><SelectValue placeholder="Selecionar usuário" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="u in options.users" :key="u.id" :value="u.id">
                {{ u.nome ?? u.email ?? u.id }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </template>

      <!-- update_lead_fields -->
      <template v-if="node.data.nodeType === 'update_lead_fields'">
        <div class="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          Objeto JSON <code>{ campo: valor }</code>. Somente campos whitelistados.
        </div>
        <div class="space-y-1">
          <Label class="text-xs">Campos (JSON)</Label>
          <textarea
            class="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            :value="JSON.stringify(node.data.config.fields ?? {}, null, 2)"
            @change="
              (() => {
                try {
                  const parsed = JSON.parse(($event.target as HTMLTextAreaElement).value)
                  if (parsed && typeof parsed === 'object')
                    patchConfig({ fields: parsed as Record<string, unknown> })
                } catch { /* invalid */ }
              })()
            "
          />
        </div>
      </template>

      <!-- set_ai_active -->
      <template v-if="node.data.nodeType === 'set_ai_active'">
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            :checked="Boolean(node.data.config.ativa ?? true)"
            @change="patchConfig({ ativa: ($event.target as HTMLInputElement).checked })"
          />
          <Label class="text-xs">IA ativa no lead</Label>
        </div>
      </template>

      <!-- pause_ai_conversation -->
      <template v-if="node.data.nodeType === 'pause_ai_conversation'">
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            :checked="Boolean(node.data.config.paused ?? true)"
            @change="patchConfig({ paused: ($event.target as HTMLInputElement).checked })"
          />
          <Label class="text-xs">Pausar IA nesta conversa</Label>
        </div>
      </template>

      <!-- invoke_agent -->
      <template v-if="node.data.nodeType === 'invoke_agent'">
        <div class="rounded-md bg-purple-50 p-3 text-xs text-purple-900">
          Executa o agente configurado na conexão imediatamente.
        </div>
      </template>

      <!-- set_variable -->
      <template v-if="node.data.nodeType === 'set_variable'">
        <div class="space-y-1">
          <Label class="text-xs">Nome</Label>
          <Input
            :model-value="String(node.data.config.name ?? '')"
            @update:model-value="patchConfig({ name: String($event) })"
          />
        </div>
        <div class="space-y-1">
          <Label class="text-xs">Valor (template)</Label>
          <Input
            :model-value="String(node.data.config.value ?? '')"
            @update:model-value="patchConfig({ value: String($event) })"
          />
        </div>
      </template>

      <!-- notify_user -->
      <template v-if="node.data.nodeType === 'notify_user'">
        <div class="space-y-1">
          <Label class="text-xs">Título</Label>
          <Input
            :model-value="String(node.data.config.title ?? '')"
            @update:model-value="patchConfig({ title: String($event) })"
          />
        </div>
        <div class="space-y-1">
          <Label class="text-xs">Mensagem</Label>
          <textarea
            class="min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            :value="String(node.data.config.message ?? '')"
            @input="patchConfig({ message: ($event.target as HTMLTextAreaElement).value })"
          />
        </div>
      </template>

      <!-- start_flow -->
      <template v-if="node.data.nodeType === 'start_flow'">
        <div class="space-y-1">
          <Label class="text-xs">Sub-fluxo</Label>
          <Select
            :model-value="String(node.data.config.flow_id ?? '')"
            @update:model-value="patchConfig({ flow_id: $event ? String($event) : '' })"
          >
            <SelectTrigger><SelectValue placeholder="Selecionar fluxo" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="f in options.flows" :key="f.id" :value="f.id">
                {{ f.name }}{{ f.status === 'published' ? '' : ` (${f.status})` }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p class="text-[11px] text-muted-foreground">
            Apenas sub-fluxos publicados serão executados em runtime.
          </p>
        </div>
        <div class="space-y-1">
          <Label class="text-xs">Variáveis iniciais (JSON)</Label>
          <textarea
            class="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            :value="JSON.stringify(node.data.config.variables ?? {}, null, 2)"
            @change="
              (() => {
                try {
                  const parsed = JSON.parse(($event.target as HTMLTextAreaElement).value)
                  if (parsed && typeof parsed === 'object')
                    patchConfig({ variables: parsed as Record<string, unknown> })
                } catch { /* invalid */ }
              })()
            "
          />
        </div>
      </template>
    </div>
  </div>
</template>
