-- Flow Builder: schema completo (definição + versões + execuções + logs).
-- Engine estilo n8n/typebot para WhatsApp.
--
-- Tabelas:
--   flows                : definição (draft/publicada) do fluxo
--   flow_versions        : histórico imutável de publicações (para auditoria)
--   flow_executions      : execução por conversa (uma ativa por vez)
--   flow_execution_steps : log de cada nó executado (auditoria/replay)
--
-- Gatilhos suportados (trigger_type):
--   lead_new_message         : primeira msg de remoteJid nunca visto
--   lead_archived_message    : msg de lead cuja coluna tem role='arquivado'
--   lead_in_service_message  : msg de lead cuja coluna tem role='atendimento'
--   lead_column_changed      : leads.coluna_id mudou (dispatch via trigger)
--   manual_chat              : disparado pelo atendente dentro do chat

begin;

-- ============================================================================
-- 1. flows (definição)
-- ============================================================================
create table if not exists public.flows (
  id uuid primary key default gen_random_uuid(),
  companies_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null check (trigger_type in (
    'lead_new_message',
    'lead_archived_message',
    'lead_in_service_message',
    'lead_column_changed',
    'manual_chat'
  )),
  -- filtros extras do gatilho (funil_id, coluna_id destino/origem, tags, horário, connection_id, etc.)
  trigger_config jsonb not null default '{}'::jsonb,
  -- estrutura do grafo: { nodes: [...], edges: [...] }
  graph jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  version int not null default 0,
  published_version int,
  published_graph jsonb, -- snapshot da última versão publicada (para novas execuções)
  published_at timestamptz,
  -- comportamento quando novo trigger dispara e já existe execução ativa na conversa:
  -- 'skip' = ignora | 'queue' = enfileira | 'abort_previous' = cancela anterior e inicia
  on_conflict text not null default 'skip' check (on_conflict in ('skip','queue','abort_previous')),
  -- delay padrão entre msgs consecutivas (segundos). Override por nó.
  default_message_delay_ms int not null default 3000 check (default_message_delay_ms >= 0),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_flows_companies_trigger_published
  on public.flows (companies_id, trigger_type)
  where status = 'published';

create index if not exists idx_flows_companies_status
  on public.flows (companies_id, status);

drop trigger if exists trg_flows_updated_at on public.flows;
create trigger trg_flows_updated_at
  before update on public.flows
  for each row execute function public.tg_set_updated_at();

comment on table public.flows is 'Definição de fluxos (workflow) tipo n8n/typebot.';
comment on column public.flows.graph is 'Grafo mutável de trabalho (draft).';
comment on column public.flows.published_graph is 'Snapshot da última versão publicada — usado como fonte para novas execuções.';

-- ============================================================================
-- 2. flow_versions (histórico imutável)
-- ============================================================================
create table if not exists public.flow_versions (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.flows(id) on delete cascade,
  version int not null,
  graph jsonb not null,
  published_by uuid references public.users(id) on delete set null,
  published_at timestamptz not null default now(),
  unique (flow_id, version)
);

create index if not exists idx_flow_versions_flow on public.flow_versions (flow_id, version desc);

comment on table public.flow_versions is 'Histórico imutável de publicações de flows. Cada linha = um deploy.';

-- ============================================================================
-- 3. flow_executions (estado por conversa)
-- ============================================================================
create table if not exists public.flow_executions (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.flows(id) on delete cascade,
  flow_version int not null,
  -- congela o grafo no momento do start pra não quebrar quando flow republica
  graph_snapshot jsonb not null,
  companies_id uuid not null references public.companies(id) on delete cascade,
  conversa_id bigint references public.whats_conversa(id) on delete cascade,
  lead_id bigint references public.leads(id) on delete cascade,
  triggered_by text not null check (triggered_by in ('ingest','manual','schedule','sub_flow','api')),
  trigger_type text,
  trigger_payload jsonb,
  parent_execution_id uuid references public.flow_executions(id) on delete set null,
  depth int not null default 0,
  status text not null default 'running' check (status in (
    'running',
    'waiting_message',
    'waiting_timer',
    'done',
    'failed',
    'aborted'
  )),
  current_node_id text,
  waiting_node_id text,
  waiting_until timestamptz,          -- timeout do wait_reply / hora do wait_delay
  variables jsonb not null default '{}'::jsonb,
  last_error text,
  dry_run boolean not null default false,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_flow_exec_conversa_active
  on public.flow_executions (conversa_id)
  where status in ('running','waiting_message','waiting_timer');

-- Uma execução ativa por conversa (regra de negócio).
-- Subfluxos (triggered_by = 'sub_flow') são excluídos para permitir
-- que o nó start_flow crie execução filha com mesmo conversa_id do pai.
create unique index if not exists ux_flow_exec_one_active_per_conversa
  on public.flow_executions (conversa_id)
  where status in ('running','waiting_message','waiting_timer')
    and conversa_id is not null
    and triggered_by != 'sub_flow';

create index if not exists idx_flow_exec_waiting_timer
  on public.flow_executions (waiting_until)
  where status = 'waiting_timer';

create index if not exists idx_flow_exec_waiting_message_timeout
  on public.flow_executions (waiting_until)
  where status = 'waiting_message' and waiting_until is not null;

create index if not exists idx_flow_exec_flow on public.flow_executions (flow_id, status);
create index if not exists idx_flow_exec_lead on public.flow_executions (lead_id);
create index if not exists idx_flow_exec_companies on public.flow_executions (companies_id, status);

comment on table public.flow_executions is 'Instâncias de execução de fluxo — uma ativa por conversa.';
comment on column public.flow_executions.graph_snapshot is 'Cópia do grafo publicado no start — imune a republicação.';
comment on column public.flow_executions.variables is 'Contexto/variáveis da execução, incluindo respostas do lead.';

-- ============================================================================
-- 4. flow_execution_steps (log de nós executados)
-- ============================================================================
create table if not exists public.flow_execution_steps (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references public.flow_executions(id) on delete cascade,
  node_id text not null,
  node_type text not null,
  status text not null check (status in ('ok','error','skipped','waiting')),
  input jsonb,
  output jsonb,
  duration_ms int,
  error text,
  executed_at timestamptz not null default now()
);

create index if not exists idx_flow_steps_execution on public.flow_execution_steps (execution_id, executed_at);

comment on table public.flow_execution_steps is 'Log passo-a-passo de execução — auditoria + replay visual.';

-- ============================================================================
-- 5. Trigger Postgres: dispara evento quando leads.coluna_id muda
-- Emite notify no canal `flow_column_changed` — worker Nitro consome e enfileira flow.step
-- ============================================================================
create or replace function public.tg_flow_lead_column_changed()
returns trigger language plpgsql as $$
begin
  if (new.coluna_id is distinct from old.coluna_id) then
    perform pg_notify(
      'flow_column_changed',
      json_build_object(
        'lead_id', new.id,
        'companies_id', new.companies_id,
        'from_coluna_id', old.coluna_id,
        'to_coluna_id', new.coluna_id,
        'at', now()
      )::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_flow_lead_column_changed on public.leads;
create trigger trg_flow_lead_column_changed
  after update of coluna_id on public.leads
  for each row execute function public.tg_flow_lead_column_changed();

-- ============================================================================
-- 6. RLS
-- ============================================================================
alter table public.flows enable row level security;
alter table public.flow_versions enable row level security;
alter table public.flow_executions enable row level security;
alter table public.flow_execution_steps enable row level security;

-- flows: OWNER da company gerencia, membros veem
drop policy if exists flows_select on public.flows;
create policy flows_select on public.flows
  for select using (companies_id = public.fn_current_user_companie_id());

drop policy if exists flows_owner_mutate on public.flows;
create policy flows_owner_mutate on public.flows
  for all using (
    companies_id = public.fn_current_user_companie_id()
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.funcao_user = 'OWNER'
    )
  );

-- flow_versions: read-only pra membros da company
drop policy if exists flow_versions_select on public.flow_versions;
create policy flow_versions_select on public.flow_versions
  for select using (
    exists (
      select 1 from public.flows f
      where f.id = flow_versions.flow_id
        and f.companies_id = public.fn_current_user_companie_id()
    )
  );
-- mutations só via service_role (Nitro publica versões)

-- flow_executions: membros da company podem ver
drop policy if exists flow_exec_select on public.flow_executions;
create policy flow_exec_select on public.flow_executions
  for select using (companies_id = public.fn_current_user_companie_id());
-- mutations só via service_role (worker do flow engine)

-- flow_execution_steps: idem
drop policy if exists flow_steps_select on public.flow_execution_steps;
create policy flow_steps_select on public.flow_execution_steps
  for select using (
    exists (
      select 1 from public.flow_executions e
      where e.id = flow_execution_steps.execution_id
        and e.companies_id = public.fn_current_user_companie_id()
    )
  );
-- mutations só via service_role

commit;
