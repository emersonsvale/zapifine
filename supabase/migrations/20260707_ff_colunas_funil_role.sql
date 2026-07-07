-- ff_colunas_funil: adiciona `role` semântico para gatilhos do flow builder.
-- Colunas padrão de todo funil: Novo, Em Atendimento, Agendado, Concluído, Perdido, Arquivado.
-- Permite que triggers como `lead_new_message` / `lead_archived_message` / `lead_column_changed`
-- resolvam colunas sem depender de match por nome (frágil).

begin;

alter table public.ff_colunas_funil
  add column if not exists role text
  check (role in ('novo','atendimento','agendado','concluido','perdido','arquivado'));

comment on column public.ff_colunas_funil.role is
  'Papel semântico da coluna (novo|atendimento|agendado|concluido|perdido|arquivado). Usado por triggers do flow builder e métricas de dashboard.';

-- Índice para lookup rápido por (companie_id, role) — dispatcher de flow
create index if not exists idx_ff_colunas_role
  on public.ff_colunas_funil (companie_id, role)
  where role is not null;

-- ============================================================================
-- Backfill: infere role a partir de nome_coluna (case-insensitive, sem acento).
-- Só preenche onde role está null pra não sobrescrever definição manual futura.
-- ============================================================================

-- Helper: normaliza (lower + remove acentos)
create or replace function public.fn_unaccent_lower(txt text)
returns text language sql immutable as $$
  select lower(
    translate(
      coalesce(txt,''),
      'áàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
    )
  );
$$;

update public.ff_colunas_funil
set role = case
  when public.fn_unaccent_lower(nome_coluna) like 'nov%'                    then 'novo'
  when public.fn_unaccent_lower(nome_coluna) like '%atend%'                 then 'atendimento'
  when public.fn_unaccent_lower(nome_coluna) like 'agend%'                  then 'agendado'
  when public.fn_unaccent_lower(nome_coluna) like 'conclu%'                 then 'concluido'
  when public.fn_unaccent_lower(nome_coluna) like 'convert%'                then 'concluido'
  when public.fn_unaccent_lower(nome_coluna) like 'ganho%'                  then 'concluido'
  when public.fn_unaccent_lower(nome_coluna) like 'fechado%'                then 'concluido'
  when public.fn_unaccent_lower(nome_coluna) like 'perd%'                   then 'perdido'
  when public.fn_unaccent_lower(nome_coluna) like 'arquiv%'                 then 'arquivado'
  else null
end
where role is null;

commit;
