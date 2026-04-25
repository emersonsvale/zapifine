import { useSupabaseAdmin } from './supabase-admin'

type TemplateRow = {
  id: string
  channel: string
  kind: string
  minutes_before: number | null
  title: string | null
  body: string
  ativo: boolean
}

export type TemplateContext = {
  title: string
  when: string
  minutes_before?: number
  link?: string | null
  meet_link?: string | null
  lead_name?: string | null
  empresa?: string | null
  atendente?: string | null
  location?: string | null
  description?: string | null
}

export type RenderedTemplate = {
  title: string
  body: string
  source: 'db' | 'fallback'
}

const FALLBACKS: Record<string, RenderedTemplate> = {
  'whatsapp:lembrete': {
    title: 'Lembrete de agendamento',
    body: '*Lembrete de agendamento*\n\nOlá! Você tem um agendamento em {minutes_before} min:\n\n*{title}*\n{when}{linkLine}',
    source: 'fallback',
  },
  'app:lembrete': {
    title: 'Agendamento em {minutes_before} min',
    body: '{title} · {when}',
    source: 'fallback',
  },
  'whatsapp:confirmacao': {
    title: 'Agendamento confirmado',
    body: '*Agendamento confirmado*\n\n*{title}*\n{when}{linkLine}\n\nNos vemos em breve!',
    source: 'fallback',
  },
  'app:confirmacao': {
    title: 'Agendamento confirmado',
    body: '{title} · {when}',
    source: 'fallback',
  },
  'whatsapp:cancelamento': {
    title: 'Agendamento cancelado',
    body: 'Seu agendamento *{title}* em {when} foi cancelado.',
    source: 'fallback',
  },
  'app:cancelamento': {
    title: 'Agendamento cancelado',
    body: '{title} · {when}',
    source: 'fallback',
  },
  'whatsapp:novo_agendamento': {
    title: 'Novo agendamento',
    body: '*Novo agendamento*\n\n*{title}*\n{when}{linkLine}\n\nAguardamos você!',
    source: 'fallback',
  },
  'app:novo_agendamento': {
    title: 'Novo agendamento',
    body: '{title} · {when}',
    source: 'fallback',
  },
}

function interpolate(tpl: string, ctx: TemplateContext): string {
  const linkLine = ctx.meet_link
    ? `\n\nLink: ${ctx.meet_link}`
    : ctx.link
      ? `\n\nDetalhes: ${ctx.link}`
      : ''
  const map: Record<string, string> = {
    '{title}': ctx.title ?? '',
    '{when}': ctx.when ?? '',
    '{minutes_before}': String(ctx.minutes_before ?? ''),
    '{link}': ctx.link ?? '',
    '{meet_link}': ctx.meet_link ?? '',
    '{linkLine}': linkLine,
    '{lead_name}': ctx.lead_name ?? '',
    '{empresa}': ctx.empresa ?? '',
    '{atendente}': ctx.atendente ?? '',
    '{location}': ctx.location ?? '',
    '{description}': ctx.description ?? '',
  }
  let out = tpl
  for (const [k, v] of Object.entries(map)) {
    out = out.split(k).join(v)
  }
  return out
}

export async function renderTemplate(opts: {
  companyId: string
  channel: 'app' | 'whatsapp'
  kind: 'lembrete' | 'confirmacao' | 'cancelamento' | 'novo_agendamento'
  minutesBefore?: number
  ctx: TemplateContext
}): Promise<RenderedTemplate> {
  const admin = useSupabaseAdmin()
  let q = admin
    .from('agenda_templates')
    .select('id, channel, kind, minutes_before, title, body, ativo')
    .eq('companie_id', opts.companyId)
    .eq('channel', opts.channel)
    .eq('kind', opts.kind)
    .eq('ativo', true)

  if (opts.kind === 'lembrete' && typeof opts.minutesBefore === 'number') {
    q = q.eq('minutes_before', opts.minutesBefore)
  }

  const { data } = await q.limit(1).maybeSingle<TemplateRow>()

  // Fallback: tenta sem minutes_before específico
  let row: TemplateRow | null = data ?? null
  if (!row && opts.kind === 'lembrete') {
    const { data: any } = await admin
      .from('agenda_templates')
      .select('id, channel, kind, minutes_before, title, body, ativo')
      .eq('companie_id', opts.companyId)
      .eq('channel', opts.channel)
      .eq('kind', opts.kind)
      .eq('ativo', true)
      .is('minutes_before', null)
      .limit(1)
      .maybeSingle<TemplateRow>()
    row = any ?? null
  }

  if (row) {
    return {
      title: interpolate(row.title ?? '', opts.ctx),
      body: interpolate(row.body, opts.ctx),
      source: 'db',
    }
  }

  const fb = FALLBACKS[`${opts.channel}:${opts.kind}`]
  if (!fb) {
    return {
      title: opts.ctx.title,
      body: `${opts.ctx.title} · ${opts.ctx.when}`,
      source: 'fallback',
    }
  }
  return {
    title: interpolate(fb.title, opts.ctx),
    body: interpolate(fb.body, opts.ctx),
    source: 'fallback',
  }
}
