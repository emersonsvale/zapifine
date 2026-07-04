-- Google Calendar per-user + multi-calendar
-- Substitui abordagem antiga (colunas gg_* em companies).
-- Colunas legacy em companies preservadas: usadas pelo fallback até migração completa.

begin;

-- ============================================================================
-- 1. google_integrations: 1 por (user, companie). Guarda OAuth tokens.
-- ============================================================================
create table if not exists public.google_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  companie_id uuid not null references public.companies(id) on delete cascade,
  gg_email text,
  gg_sub text, -- sub OpenID (identifica conta Google)
  access_token text,
  refresh_token text not null,
  token_expires_at timestamptz,
  scopes text[],
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_google_integrations_user_email
  on public.google_integrations(user_id, gg_email)
  where revoked_at is null;

create index if not exists idx_google_integrations_companie
  on public.google_integrations(companie_id)
  where revoked_at is null;

drop trigger if exists trg_google_integrations_updated_at on public.google_integrations;
create trigger trg_google_integrations_updated_at
  before update on public.google_integrations
  for each row execute function public.tg_set_updated_at();

-- ============================================================================
-- 2. google_calendars: N por integration. `selected` controla sync.
--    `default_write` marca calendário onde novos eventos criados via Zapifine
--    vão parar.
-- ============================================================================
create table if not exists public.google_calendars (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.google_integrations(id) on delete cascade,
  gg_calendar_id text not null,
  summary text,
  description text,
  time_zone text,
  primary_flag boolean not null default false,
  access_role text, -- owner, writer, reader
  selected boolean not null default true,
  default_write boolean not null default false,
  sync_token text,
  synced_at timestamptz,
  color_hex text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_google_calendars_integ_calid
  on public.google_calendars(integration_id, gg_calendar_id);

create index if not exists idx_google_calendars_selected
  on public.google_calendars(integration_id)
  where selected;

-- Garante 1 default_write por integration
create unique index if not exists ux_google_calendars_default_write
  on public.google_calendars(integration_id)
  where default_write;

drop trigger if exists trg_google_calendars_updated_at on public.google_calendars;
create trigger trg_google_calendars_updated_at
  before update on public.google_calendars
  for each row execute function public.tg_set_updated_at();

-- ============================================================================
-- 3. agendamentos: liga a integration + calendar de origem
-- ============================================================================
alter table public.agendamentos
  add column if not exists integration_id uuid references public.google_integrations(id) on delete set null,
  add column if not exists source_calendar_id uuid references public.google_calendars(id) on delete set null;

create index if not exists idx_agendamentos_integration on public.agendamentos(integration_id);
create index if not exists idx_agendamentos_source_calendar on public.agendamentos(source_calendar_id);

-- ============================================================================
-- 4. RLS
-- ============================================================================
alter table public.google_integrations enable row level security;
alter table public.google_calendars enable row level security;

-- Integrations: user vê próprias; OWNER vê todas da companie
drop policy if exists google_integrations_select on public.google_integrations;
create policy google_integrations_select on public.google_integrations
  for select using (
    user_id = auth.uid()
    or (
      companie_id = public.fn_current_user_companie_id()
      and exists (
        select 1 from public.users u
        where u.id = auth.uid() and u.funcao_user = 'OWNER'
      )
    )
  );
-- mutations só via service_role (Nitro)

-- Calendars: idem via integration
drop policy if exists google_calendars_select on public.google_calendars;
create policy google_calendars_select on public.google_calendars
  for select using (
    exists (
      select 1 from public.google_integrations gi
      where gi.id = google_calendars.integration_id
        and (
          gi.user_id = auth.uid()
          or (
            gi.companie_id = public.fn_current_user_companie_id()
            and exists (
              select 1 from public.users u
              where u.id = auth.uid() and u.funcao_user = 'OWNER'
            )
          )
        )
    )
  );

commit;
