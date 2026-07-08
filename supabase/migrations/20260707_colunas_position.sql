-- Ordenação custom das colunas do funil (fixas + custom). OWNER pode reordenar.

alter table public.ff_colunas_funil
  add column if not exists position int;

-- Backfill: numera por funil na ordem atual (id asc).
with r as (
  select id, row_number() over (partition by funil_id order by id asc) as rn
  from public.ff_colunas_funil
)
update public.ff_colunas_funil c
set position = r.rn
from r
where r.id = c.id
  and (c.position is null);

alter table public.ff_colunas_funil
  alter column position set default 0;

comment on column public.ff_colunas_funil.position is
  'Ordem exibida no kanban. Mutável só por OWNER via reorder_funil_colunas.';

-- RPC: reordena colunas do funil. p_ids na ordem desejada.
create or replace function public.reorder_funil_colunas(
  p_funil_id int,
  p_ids int[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid;
  v_role text;
  v_expected int;
  v_received int;
begin
  select fn_current_user_companie_id() into v_company;
  select funcao_user into v_role from public.users where id = auth.uid();
  if v_role is distinct from 'OWNER' then
    raise exception 'Apenas OWNER pode reordenar colunas.';
  end if;

  if not exists (
    select 1 from public.ff_funil
    where id = p_funil_id and companie_id = v_company
  ) then
    raise exception 'Funil % não pertence à empresa.', p_funil_id;
  end if;

  select count(*) into v_expected
  from public.ff_colunas_funil
  where funil_id = p_funil_id and companie_id = v_company;

  v_received := coalesce(array_length(p_ids, 1), 0);
  if v_received <> v_expected then
    raise exception 'Lista de ids incompleta: esperado %, recebido %.', v_expected, v_received;
  end if;

  if exists (
    select 1
    from unnest(p_ids) with ordinality as t(id, ord)
    left join public.ff_colunas_funil c
      on c.id = t.id and c.funil_id = p_funil_id and c.companie_id = v_company
    where c.id is null
  ) then
    raise exception 'Um ou mais ids não pertencem ao funil.';
  end if;

  update public.ff_colunas_funil c
  set position = t.ord
  from unnest(p_ids) with ordinality as t(id, ord)
  where c.id = t.id
    and c.funil_id = p_funil_id
    and c.companie_id = v_company;
end;
$$;

comment on function public.reorder_funil_colunas(int, int[]) is
  'Atualiza position das colunas do funil na ordem dos ids informados. OWNER only.';

revoke all on function public.reorder_funil_colunas(int, int[]) from public;
revoke execute on function public.reorder_funil_colunas(int, int[]) from anon;
grant execute on function public.reorder_funil_colunas(int, int[]) to authenticated;
