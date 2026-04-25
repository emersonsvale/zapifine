-- Agendas: setup completo (Google Calendar nativo + disponibilidade + lembretes)
-- Substitui edge functions n8n.

begin;

-- ============================================================================
-- 1. companies: campos OAuth Google adicionais
-- ============================================================================
alter table public.companies
  add column if not exists gg_token_expires_at timestamptz,
  add column if not exists gg_calendar_id text,
  add column if not exists gg_email text,
  add column if not exists gg_scopes text[],
  add column if not exists gg_sync_token text,
  add column if not exists gg_synced_at timestamptz;

-- ============================================================================
-- 2. agendamentos: novos campos
-- ============================================================================
alter table public.agendamentos
  add column if not exists user_id uuid references public.users(id) on delete set null,
  add column if not exists description text,
  add column if not exists location text,
  add column if not exists meet_link text,
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_agendamentos_companie_id on public.agendamentos(companie_id);
create index if not exists idx_agendamentos_user_id on public.agendamentos(user_id);
create index if not exists idx_agendamentos_lead_id on public.agendamentos(lead_id);
create index if not exists idx_agendamentos_gg_start on public.agendamentos(gg_start);

-- Trigger updated_at
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_agendamentos_updated_at on public.agendamentos;
create trigger trg_agendamentos_updated_at
  before update on public.agendamentos
  for each row execute function public.tg_set_updated_at();

-- ============================================================================
-- 3. agendamento_attendees (convidados / leads)
-- ============================================================================
create table if not exists public.agendamento_attendees (
  id uuid primary key default gen_random_uuid(),
  agendamento_id text not null references public.agendamentos(id) on delete cascade,
  lead_id bigint references public.leads(id) on delete set null,
  email text not null,
  display_name text,
  response_status text default 'needsAction' check (response_status in ('needsAction','accepted','declined','tentative')),
  is_organizer boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_attendees_agendamento on public.agendamento_attendees(agendamento_id);
create index if not exists idx_attendees_lead on public.agendamento_attendees(lead_id);
create unique index if not exists ux_attendees_ag_email on public.agendamento_attendees(agendamento_id, lower(email));

-- ============================================================================
-- 4. agenda_horarios_semanal (disponibilidade recorrente por user)
-- ============================================================================
create table if not exists public.agenda_horarios_semanal (
  id uuid primary key default gen_random_uuid(),
  companie_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0=domingo .. 6=sabado
  start_time time not null,
  end_time time not null,
  ativo boolean default true,
  created_at timestamptz default now(),
  check (end_time > start_time)
);

create index if not exists idx_horarios_companie_user on public.agenda_horarios_semanal(companie_id, user_id);
create index if not exists idx_horarios_user_weekday on public.agenda_horarios_semanal(user_id, weekday) where ativo;

-- ============================================================================
-- 5. agenda_excecoes (bloqueios e overrides em datas específicas)
-- ============================================================================
create table if not exists public.agenda_excecoes (
  id uuid primary key default gen_random_uuid(),
  companie_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  data date not null,
  kind text not null check (kind in ('bloqueio','override')),
  start_time time,
  end_time time,
  motivo text,
  created_at timestamptz default now(),
  check (
    (kind = 'bloqueio' and start_time is null and end_time is null)
    or (kind = 'override' and start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index if not exists idx_excecoes_user_data on public.agenda_excecoes(companie_id, user_id, data);

-- ============================================================================
-- 6. agenda_lembretes (fila de lembretes app/whatsapp)
-- ============================================================================
create table if not exists public.agenda_lembretes (
  id uuid primary key default gen_random_uuid(),
  agendamento_id text not null references public.agendamentos(id) on delete cascade,
  fire_at timestamptz not null,
  channel text not null check (channel in ('app','whatsapp')),
  target text, -- numero whatsapp ou user_id (uuid)
  payload jsonb,
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  attempts int not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_lembretes_pending_fire on public.agenda_lembretes(fire_at) where status = 'pending';
create index if not exists idx_lembretes_agendamento on public.agenda_lembretes(agendamento_id);

-- ============================================================================
-- 7. RLS
-- ============================================================================
alter table public.agendamento_attendees enable row level security;
alter table public.agenda_horarios_semanal enable row level security;
alter table public.agenda_excecoes enable row level security;
alter table public.agenda_lembretes enable row level security;

-- Helper: companie_id do usuário autenticado
create or replace function public.fn_current_user_companie_id()
returns uuid language sql stable security definer set search_path = public as $$
  select companie_id from public.users where id = auth.uid();
$$;

-- attendees: select se for da empresa do agendamento
drop policy if exists attendees_select on public.agendamento_attendees;
create policy attendees_select on public.agendamento_attendees
  for select using (
    exists (
      select 1 from public.agendamentos a
      where a.id = agendamento_attendees.agendamento_id
        and a.companie_id = public.fn_current_user_companie_id()
    )
  );
-- mutations só via service_role (Nitro)

-- horarios_semanal: select por companie do user
drop policy if exists horarios_select on public.agenda_horarios_semanal;
create policy horarios_select on public.agenda_horarios_semanal
  for select using (companie_id = public.fn_current_user_companie_id());

drop policy if exists horarios_user_mutate on public.agenda_horarios_semanal;
create policy horarios_user_mutate on public.agenda_horarios_semanal
  for all using (
    companie_id = public.fn_current_user_companie_id()
    and (user_id = auth.uid() or exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.funcao_user = 'OWNER'
    ))
  );

-- excecoes: idem
drop policy if exists excecoes_select on public.agenda_excecoes;
create policy excecoes_select on public.agenda_excecoes
  for select using (companie_id = public.fn_current_user_companie_id());

drop policy if exists excecoes_user_mutate on public.agenda_excecoes;
create policy excecoes_user_mutate on public.agenda_excecoes
  for all using (
    companie_id = public.fn_current_user_companie_id()
    and (user_id = auth.uid() or exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.funcao_user = 'OWNER'
    ))
  );

-- lembretes: select se for da empresa
drop policy if exists lembretes_select on public.agenda_lembretes;
create policy lembretes_select on public.agenda_lembretes
  for select using (
    exists (
      select 1 from public.agendamentos a
      where a.id = agenda_lembretes.agendamento_id
        and a.companie_id = public.fn_current_user_companie_id()
    )
  );
-- mutations só via service_role

commit;
