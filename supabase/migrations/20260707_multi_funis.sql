-- Multi funis: RLS em ff_funil / ff_colunas_funil + RPCs de criação e exclusão.
-- Regras de negócio:
--   * Todo funil nasce com 6 colunas fixas (role IS NOT NULL): novo, atendimento,
--     agendado, concluido, perdido, arquivado. Essas colunas não podem ser editadas
--     nem excluídas (enforce por check + policies).
--   * Somente OWNER da company pode criar/renomear/excluir funil.
--   * O funil padrão da empresa (companies.funil_incial_id) não pode ser excluído.
--   * Ao excluir um funil, os leads são movidos para outro funil da mesma empresa;
--     colunas com role são mapeadas por role (novo→novo, etc); colunas custom caem
--     na coluna 'novo' do funil destino.

begin;

-- ============================================================================
-- 1. RLS ff_funil
-- ============================================================================
alter table public.ff_funil enable row level security;

drop policy if exists ff_funil_select on public.ff_funil;
create policy ff_funil_select on public.ff_funil
  for select using (companie_id = public.fn_current_user_companie_id());

drop policy if exists ff_funil_owner_mutate on public.ff_funil;
create policy ff_funil_owner_mutate on public.ff_funil
  for all using (
    companie_id = public.fn_current_user_companie_id()
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.funcao_user = 'OWNER'
    )
  );

-- ============================================================================
-- 2. RLS ff_colunas_funil
-- Membros veem; OWNER muta; colunas fixas (role IS NOT NULL) travadas contra
-- UPDATE de nome/role e DELETE.
-- ============================================================================
alter table public.ff_colunas_funil enable row level security;

drop policy if exists ff_colunas_select on public.ff_colunas_funil;
create policy ff_colunas_select on public.ff_colunas_funil
  for select using (companie_id = public.fn_current_user_companie_id());

-- INSERT: só OWNER + role NULL (fixas são criadas apenas via RPC create_funil_with_defaults,
-- que usa security definer e ignora policy)
drop policy if exists ff_colunas_owner_insert on public.ff_colunas_funil;
create policy ff_colunas_owner_insert on public.ff_colunas_funil
  for insert with check (
    companie_id = public.fn_current_user_companie_id()
    and role is null
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.funcao_user = 'OWNER'
    )
  );

-- UPDATE: OWNER, e a linha alvo deve ter role NULL (fixa não edita)
drop policy if exists ff_colunas_owner_update on public.ff_colunas_funil;
create policy ff_colunas_owner_update on public.ff_colunas_funil
  for update using (
    companie_id = public.fn_current_user_companie_id()
    and role is null
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.funcao_user = 'OWNER'
    )
  ) with check (
    companie_id = public.fn_current_user_companie_id()
    and role is null
  );

-- DELETE: OWNER, apenas colunas sem role
drop policy if exists ff_colunas_owner_delete on public.ff_colunas_funil;
create policy ff_colunas_owner_delete on public.ff_colunas_funil
  for delete using (
    companie_id = public.fn_current_user_companie_id()
    and role is null
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.funcao_user = 'OWNER'
    )
  );

-- ============================================================================
-- 3. RPC: criar funil com as 6 colunas fixas
-- ============================================================================
create or replace function public.create_funil_with_defaults(p_nome text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_companie_id uuid;
  v_funcao text;
  v_funil_id int;
begin
  if v_user_id is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;

  select companie_id, funcao_user into v_companie_id, v_funcao
  from public.users where id = v_user_id;

  if v_companie_id is null then
    raise exception 'Usuário sem empresa.' using errcode = '42501';
  end if;

  if coalesce(v_funcao, '') <> 'OWNER' then
    raise exception 'Apenas OWNER pode criar funis.' using errcode = '42501';
  end if;

  if p_nome is null or btrim(p_nome) = '' then
    raise exception 'Nome do funil obrigatório.' using errcode = '22023';
  end if;

  insert into public.ff_funil (companie_id, nome_funil, user_id)
  values (v_companie_id, btrim(p_nome), v_user_id)
  returning id into v_funil_id;

  insert into public.ff_colunas_funil (funil_id, companie_id, nome_coluna, role, user_id)
  values
    (v_funil_id, v_companie_id, 'Novo',           'novo',         v_user_id),
    (v_funil_id, v_companie_id, 'Em Atendimento', 'atendimento',  v_user_id),
    (v_funil_id, v_companie_id, 'Agendado',       'agendado',     v_user_id),
    (v_funil_id, v_companie_id, 'Concluído',      'concluido',    v_user_id),
    (v_funil_id, v_companie_id, 'Perdido',        'perdido',      v_user_id),
    (v_funil_id, v_companie_id, 'Arquivado',      'arquivado',    v_user_id);

  return v_funil_id;
end;
$$;

comment on function public.create_funil_with_defaults(text) is
  'Cria funil na empresa do OWNER + 6 colunas fixas (role novo|atendimento|agendado|concluido|perdido|arquivado).';

revoke all on function public.create_funil_with_defaults(text) from public;
grant execute on function public.create_funil_with_defaults(text) to authenticated;

-- ============================================================================
-- 4. RPC: excluir funil e mover leads para outro funil
-- ============================================================================
create or replace function public.delete_funil_and_move_leads(
  p_funil_id int,
  p_target_funil_id int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_companie_id uuid;
  v_funcao text;
  v_default_funil int;
  v_target_companie uuid;
  v_target_novo_col int;
begin
  if v_user_id is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;

  select companie_id, funcao_user into v_companie_id, v_funcao
  from public.users where id = v_user_id;

  if v_companie_id is null then
    raise exception 'Usuário sem empresa.' using errcode = '42501';
  end if;

  if coalesce(v_funcao, '') <> 'OWNER' then
    raise exception 'Apenas OWNER pode excluir funis.' using errcode = '42501';
  end if;

  if p_funil_id = p_target_funil_id then
    raise exception 'Funil de destino deve ser diferente do funil excluído.' using errcode = '22023';
  end if;

  -- funil origem pertence à empresa?
  if not exists (
    select 1 from public.ff_funil
    where id = p_funil_id and companie_id = v_companie_id
  ) then
    raise exception 'Funil de origem não encontrado.' using errcode = '42704';
  end if;

  -- funil destino pertence à empresa?
  select companie_id into v_target_companie
  from public.ff_funil where id = p_target_funil_id;

  if v_target_companie is null or v_target_companie <> v_companie_id then
    raise exception 'Funil de destino não encontrado.' using errcode = '42704';
  end if;

  -- funil padrão não pode ser excluído
  select funil_incial_id into v_default_funil
  from public.companies where id = v_companie_id;

  if v_default_funil is not null and v_default_funil = p_funil_id then
    raise exception 'O funil padrão da empresa não pode ser excluído.' using errcode = '42501';
  end if;

  -- coluna 'novo' do destino (fallback pra leads em colunas custom)
  select id into v_target_novo_col
  from public.ff_colunas_funil
  where funil_id = p_target_funil_id and role = 'novo'
  limit 1;

  if v_target_novo_col is null then
    raise exception 'Funil destino não tem coluna com role=novo.' using errcode = '42704';
  end if;

  -- Mover leads: mapear coluna por role. Colunas sem role (custom) → coluna 'novo' do destino.
  update public.leads l
  set
    funil_id = p_target_funil_id,
    coluna_id = coalesce(
      (
        select tgt.id from public.ff_colunas_funil tgt
        join public.ff_colunas_funil src on src.id = l.coluna_id
        where tgt.funil_id = p_target_funil_id
          and src.role is not null
          and tgt.role = src.role
        limit 1
      ),
      v_target_novo_col
    )
  where l.funil_id = p_funil_id
    and l.companies_id = v_companie_id;

  -- Deletar colunas do funil (bypass RLS via security definer)
  delete from public.ff_colunas_funil where funil_id = p_funil_id;

  -- Deletar funil
  delete from public.ff_funil where id = p_funil_id and companie_id = v_companie_id;
end;
$$;

comment on function public.delete_funil_and_move_leads(int, int) is
  'Exclui funil (OWNER) e move leads para funil destino mapeando colunas por role.';

revoke all on function public.delete_funil_and_move_leads(int, int) from public;
grant execute on function public.delete_funil_and_move_leads(int, int) to authenticated;

commit;
