-- Kanban stats: stage_since em leads (para tempo médio no estágio) + RPC agregando
-- unread por lead e last_msg_at para o card e o header da coluna.

alter table public.leads
  add column if not exists stage_since timestamptz default now();

-- Backfill: usa ultima_interacao_lead ou created_at como aproximação inicial.
update public.leads
set stage_since = coalesce(ultima_interacao_lead, created_at, now())
where stage_since is null;

create or replace function public.tg_leads_touch_stage_since()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'UPDATE' and new.coluna_id is distinct from old.coluna_id) then
    new.stage_since := now();
  elsif (tg_op = 'INSERT' and new.stage_since is null) then
    new.stage_since := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_leads_touch_stage_since on public.leads;
create trigger trg_leads_touch_stage_since
  before insert or update of coluna_id on public.leads
  for each row execute function public.tg_leads_touch_stage_since();

comment on column public.leads.stage_since is
  'Timestamp de entrada na coluna atual. Atualizado por trigger em cada mudança de coluna_id.';

-- RPC: stats por lead do funil ativo. RLS via fn_current_user_companie_id.
create or replace function public.lead_kanban_stats(p_funil_id int)
returns table (
  lead_id bigint,
  unread int,
  last_msg_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id as lead_id,
    coalesce(sum(
      case when m.status = 'Recebida'::public.enum_status_mensagem
            and coalesce(m.visto, false) = false
           then 1 else 0 end
    ), 0)::int as unread,
    max(m.created_at) as last_msg_at
  from public.leads l
  left join public.whats_conversa c on c.lead_id = l.id
  left join public.whats_mensagens_conversa m on m.whats_conversa_id = c.id
  where l.companies_id = public.fn_current_user_companie_id()
    and l.funil_id = p_funil_id
  group by l.id;
$$;

comment on function public.lead_kanban_stats(int) is
  'Retorna unread + last_msg_at por lead do funil informado, escopado à empresa do usuário.';

revoke all on function public.lead_kanban_stats(int) from public;
revoke execute on function public.lead_kanban_stats(int) from anon;
grant execute on function public.lead_kanban_stats(int) to authenticated;
