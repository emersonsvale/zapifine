alter table public.agendamentos
  add column if not exists is_external boolean not null default false;

create index if not exists idx_agendamentos_is_external
  on public.agendamentos(companie_id, is_external);
