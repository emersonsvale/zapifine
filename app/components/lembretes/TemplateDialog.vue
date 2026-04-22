<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import type { Database } from '~~/types/database'

type Template = Database['public']['Tables']['lembretes_templates']['Row']
type Tipo = Database['public']['Enums']['enum_tipo_lembretes']

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  template: Template | null
}>()

const { createTemplate, updateTemplate } = useLembretes()

const form = reactive({
  titulo: '',
  mensagem: '',
  tipo_lembrete: '' as '' | Tipo,
})

const saving = ref(false)
const errorMsg = ref('')

watch(open, (v) => {
  if (!v) return
  errorMsg.value = ''
  if (props.template) {
    form.titulo = props.template.titulo ?? ''
    form.mensagem = props.template.mensagem ?? ''
    form.tipo_lembrete = props.template.tipo_lembrete ?? ''
  } else {
    form.titulo = ''
    form.mensagem = ''
    form.tipo_lembrete = ''
  }
})

async function submit() {
  errorMsg.value = ''
  if (!form.titulo.trim()) {
    errorMsg.value = 'Informe o título.'
    return
  }
  if (!form.mensagem.trim()) {
    errorMsg.value = 'Informe a mensagem.'
    return
  }
  if (!form.tipo_lembrete) {
    errorMsg.value = 'Selecione o tipo.'
    return
  }
  saving.value = true
  try {
    if (props.template) {
      await updateTemplate(props.template.id, {
        titulo: form.titulo.trim(),
        mensagem: form.mensagem.trim(),
        tipo_lembrete: form.tipo_lembrete,
      })
    } else {
      await createTemplate({
        titulo: form.titulo.trim(),
        mensagem: form.mensagem.trim(),
        tipo_lembrete: form.tipo_lembrete,
      })
    }
    open.value = false
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : 'Falha ao salvar template.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {{ template ? 'Editar Template' : 'Novo Template de Lembretes' }}
        </DialogTitle>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="submit">
        <div class="space-y-1.5">
          <Label for="tpl-title">Título</Label>
          <Input id="tpl-title" v-model="form.titulo" />
        </div>

        <div class="space-y-1.5">
          <Label for="tpl-msg">Mensagem</Label>
          <textarea
            id="tpl-msg"
            v-model="form.mensagem"
            rows="5"
            class="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        <div class="space-y-1.5">
          <Label for="tpl-tipo">Tipo lembrete</Label>
          <Select v-model="form.tipo_lembrete">
            <SelectTrigger id="tpl-tipo">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Agendamento">Agendamento</SelectItem>
              <SelectItem value="Confirmação">Confirmação</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p
          v-if="errorMsg"
          class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {{ errorMsg }}
        </p>

        <DialogFooter>
          <Button variant="outline" type="button" @click="open = false">
            Cancelar
          </Button>
          <Button type="submit" :disabled="saving">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            Salvar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
