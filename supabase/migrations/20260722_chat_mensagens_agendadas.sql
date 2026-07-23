-- ============================================================================
-- FEATURE: Mensagens agendadas no chat (multiatendimento).
--   * O atendente cria uma mensagem (texto, mídia ou link) e escolhe data/hora.
--   * A fila `chat_mensagens_agendadas` é consumida pelo worker
--     POST /api/internal/mensagens-agendadas/tick (mesmo padrão de agenda_lembretes).
--   * Status: pending -> sent | failed | canceled.
-- ============================================================================

begin;

create table if not exists public.chat_mensagens_agendadas (
  id             uuid primary key default gen_random_uuid(),
  companies_id   uuid   not null references public.companies(id)       on delete cascade,
  conversa_id    bigint not null references public.whats_conversa(id)  on delete cascade,
  lead_id        bigint references public.leads(id)                    on delete set null,
  created_by     uuid   references auth.users(id)                      on delete set null,

  tipo           text not null default 'text'
                   check (tipo in ('text', 'media', 'link')),
  mensagem       text,

  midia_url      text,
  midia_nome     text,
  midia_mime     text,
  midia_tipo     text check (midia_tipo in ('image', 'video', 'audio', 'document')),

  link_url       text,
  link_titulo    text,
  link_descricao text,

  scheduled_at   timestamptz not null,

  status         text not null default 'pending'
                   check (status in ('pending', 'sent', 'failed', 'canceled')),
  attempts       int  not null default 0,
  last_error     text,
  sent_at        timestamptz,
  id_mensagem    text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Cada tipo exige o seu campo obrigatório.
  constraint chat_msg_agendada_payload_ck check (
    (tipo = 'text'  and coalesce(btrim(mensagem), '') <> '')
    or (tipo = 'media' and coalesce(btrim(midia_url), '') <> '')
    or (tipo = 'link'  and coalesce(btrim(link_url), '') <> '')
  )
);

create index if not exists idx_chat_msg_agendada_conversa
  on public.chat_mensagens_agendadas (conversa_id, scheduled_at desc);

-- Usado pelo worker: só as pendentes vencidas.
create index if not exists idx_chat_msg_agendada_pending_fire
  on public.chat_mensagens_agendadas (scheduled_at)
  where status = 'pending';

drop trigger if exists tg_chat_msg_agendada_updated_at on public.chat_mensagens_agendadas;
create trigger tg_chat_msg_agendada_updated_at
  before update on public.chat_mensagens_agendadas
  for each row execute function public.tg_set_updated_at();

alter table public.chat_mensagens_agendadas enable row level security;

-- Qualquer atendente da empresa vê e gerencia os agendamentos da empresa
-- (mesma regra das conversas: o time inteiro atende a mesma fila).
drop policy if exists chat_msg_agendada_company on public.chat_mensagens_agendadas;
create policy chat_msg_agendada_company on public.chat_mensagens_agendadas
  for all to authenticated
  using      (companies_id = current_company_id())
  with check (companies_id = current_company_id());

grant select, insert, update, delete on public.chat_mensagens_agendadas to authenticated;

-- ========================= cron (mesmo padrão dos lembretes) =========================
-- pg_cron chama o worker do Nuxt a cada minuto, com o x-cron-secret.
insert into private.cron_config (key, value)
select 'mensagens_agendadas_tick_url',
       'https://app.zapifine.com/api/internal/mensagens-agendadas/tick'
where not exists (
  select 1 from private.cron_config where key = 'mensagens_agendadas_tick_url'
);

create or replace function private.cron_tick_mensagens_agendadas()
  returns void
  language plpgsql
  security definer
  set search_path to 'public', 'extensions', 'net'
as $function$
declare
  v_url text;
  v_secret text;
begin
  v_url := private.cfg('mensagens_agendadas_tick_url');
  v_secret := private.cfg('cron_secret');
  if v_url is null or v_secret is null then
    raise notice 'cron_tick_mensagens_agendadas: faltam configs.';
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$function$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'chat_mensagens_agendadas_tick') then
    perform cron.unschedule('chat_mensagens_agendadas_tick');
  end if;
  perform cron.schedule(
    'chat_mensagens_agendadas_tick',
    '* * * * *',
    'select private.cron_tick_mensagens_agendadas();'
  );
end
$$;

commit;

-- ============================================================================
-- ROLLBACK:
--   begin;
--   select cron.unschedule('chat_mensagens_agendadas_tick');
--   drop function if exists private.cron_tick_mensagens_agendadas();
--   delete from private.cron_config where key = 'mensagens_agendadas_tick_url';
--   drop table if exists public.chat_mensagens_agendadas;
--   commit;
-- ============================================================================
