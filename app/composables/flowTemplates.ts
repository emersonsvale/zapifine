import type { FlowTriggerType, FlowGraph } from './useFlows'

export type FlowTemplate = {
  id: string
  name: string
  description: string
  triggerType: FlowTriggerType
  triggerConfig: Record<string, unknown>
  graph: FlowGraph
}

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'instagram_comment_link',
    name: 'Instagram: responder comentário com link',
    description:
      'Quando alguém comentar uma palavra-chave no seu post, envia DM automático com o link que você definir.',
    triggerType: 'instagram_comment',
    triggerConfig: { keyword: 'quero saber mais' },
    graph: {
      nodes: [
        {
          id: 'trigger',
          type: 'trigger',
          label: 'Comentário detectado',
          position: { x: 200, y: 40 },
          config: {},
          next: 'send_dm',
        },
        {
          id: 'send_dm',
          type: 'send_text',
          label: 'Enviar DM com link',
          position: { x: 200, y: 180 },
          config: {
            text: 'Olá! Vi que você comentou no meu post 😊\n\nAqui está o link que você pediu:\n👉 https://seusite.com/pagina',
            delay_ms: 3000,
          },
          next: 'end_1',
        },
        {
          id: 'end_1',
          type: 'end',
          label: 'Fim',
          position: { x: 200, y: 320 },
          config: {},
          next: null,
        },
      ],
      edges: [
        { from: 'trigger', to: 'send_dm' },
        { from: 'send_dm', to: 'end_1' },
      ],
    },
  },
  {
    id: 'instagram_comment_conversa',
    name: 'Instagram: comentário → conversa',
    description:
      'Detecta palavra-chave no comentário, envia DM perguntando se quer ajuda e espera a resposta.',
    triggerType: 'instagram_comment',
    triggerConfig: { keyword: 'ajuda' },
    graph: {
      nodes: [
        {
          id: 'trigger',
          type: 'trigger',
          label: 'Comentário detectado',
          position: { x: 200, y: 40 },
          config: {},
          next: 'send_question',
        },
        {
          id: 'send_question',
          type: 'send_text',
          label: 'Perguntar se quer ajuda',
          position: { x: 200, y: 170 },
          config: {
            text: 'Olá! Vi seu comentário pedindo ajuda. Posso te ajudar? Me conta mais sobre o que você precisa 😊',
            delay_ms: 3000,
          },
          next: 'wait_reply_1',
        },
        {
          id: 'wait_reply_1',
          type: 'wait_reply',
          label: 'Aguardar resposta',
          position: { x: 200, y: 300 },
          config: { variable: 'resposta', timeout_seconds: 86400 },
          next: 'send_confirm',
        },
        {
          id: 'send_confirm',
          type: 'send_text',
          label: 'Confirmar recebimento',
          position: { x: 200, y: 430 },
          config: {
            text: 'Obrigado! Recebi sua mensagem. Nossa equipe vai analisar e retornar em breve.',
            delay_ms: 2000,
          },
          next: 'end_1',
        },
        {
          id: 'end_1',
          type: 'end',
          label: 'Fim',
          position: { x: 200, y: 560 },
          config: {},
          next: null,
        },
      ],
      edges: [
        { from: 'trigger', to: 'send_question' },
        { from: 'send_question', to: 'wait_reply_1' },
        { from: 'wait_reply_1', to: 'send_confirm' },
        { from: 'send_confirm', to: 'end_1' },
      ],
    },
  },
]

export function getTemplateById(id: string): FlowTemplate | undefined {
  return FLOW_TEMPLATES.find((t) => t.id === id)
}
