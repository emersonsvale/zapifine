-- ============================================================================
-- FEATURE: Fixar conversas no topo da lista (por atendente, ilimitado).
--   * Cada usuário fixa as SUAS conversas; não afeta a lista dos outros.
--   * chat_pins(user_id, conversa_id) — 1 linha por pin.
--   * chat_list passa a expor `fixada` (LEFT JOIN por auth.uid()); o client
--     ordena as fixadas no topo (independente da direção de ordenação).
-- ============================================================================

begin;

-- ========================= 1. tabela chat_pins =========================
create table if not exists public.chat_pins (
  companies_id uuid   not null references public.companies(id)        on delete cascade,
  user_id      uuid   not null references auth.users(id)             on delete cascade,
  conversa_id  bigint not null references public.whats_conversa(id)  on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, conversa_id)
);

create index if not exists idx_chat_pins_user on public.chat_pins (user_id, companies_id);

alter table public.chat_pins enable row level security;

-- Cada usuário só vê/mexe nos próprios pins, dentro da própria empresa.
drop policy if exists chat_pins_own on public.chat_pins;
create policy chat_pins_own on public.chat_pins
  for all to authenticated
  using      (user_id = auth.uid())
  with check (user_id = auth.uid() and companies_id = current_company_id());

grant select, insert, delete on public.chat_pins to authenticated;

-- ========================= 2. chat_list + fixada =========================
-- Adicionar coluna ao RETURNS TABLE muda o tipo de retorno -> exige DROP + CREATE.
drop function if exists public.chat_list(uuid);

create function public.chat_list(p_company_id uuid)
  returns table(
    id bigint,
    "remoteJid" text,
    lead_id bigint,
    companies_id uuid,
    created_at timestamp with time zone,
    last_read_at timestamp with time zone,
    lead_nome text,
    lead_numero text,
    lead_resumo text,
    lead_ia_ativa boolean,
    lead_avatar_url text,
    last_message text,
    last_message_at timestamp with time zone,
    last_message_tipo text,
    last_message_status enum_status_mensagem,
    unread_count bigint,
    assigned_to uuid,
    assigned_nome text,
    setor_id uuid,
    setor_nome text,
    setor_cor text,
    provider enum_whatsapp_provider,
    funil_nome text,
    coluna_nome text,
    arquivada boolean,
    fixada boolean
  )
  language sql
  stable
  set search_path to 'public'
as $function$
  SELECT
    c.id,
    c."remoteJid",
    c.lead_id,
    c.companies_id,
    c.created_at,
    c.last_read_at,
    l.nome_lead              AS lead_nome,
    l.numero_whatsapp_lead   AS lead_numero,
    l.resumo_lead            AS lead_resumo,
    COALESCE(l.ia_ativa, false) AS lead_ia_ativa,
    l.avatar_url             AS lead_avatar_url,
    lm.mensagem              AS last_message,
    lm.created_at            AS last_message_at,
    lm.tipo                  AS last_message_tipo,
    lm.status                AS last_message_status,
    COALESCE(uc.cnt, 0)      AS unread_count,
    c.assigned_to            AS assigned_to,
    au.nome                  AS assigned_nome,
    c.setor_id               AS setor_id,
    s.nome                   AS setor_nome,
    s.cor                    AS setor_cor,
    wc.provider              AS provider,
    f.nome_funil             AS funil_nome,
    fc.nome_coluna           AS coluna_nome,
    COALESCE(c.arquivada, false) AS arquivada,
    (cp.conversa_id IS NOT NULL)  AS fixada
  FROM public.whats_conversa c
  LEFT JOIN public.leads l ON l.id = c.lead_id
  LEFT JOIN public.users au ON au.id = c.assigned_to
  LEFT JOIN public.setores s ON s.id = c.setor_id
  LEFT JOIN public.whatsapp_connections wc ON wc.id = c.whatsapp_connection_id
  LEFT JOIN public.ff_funil f ON f.id = l.funil_id
  LEFT JOIN public.ff_colunas_funil fc ON fc.id = l.coluna_id
  LEFT JOIN public.chat_pins cp ON cp.conversa_id = c.id AND cp.user_id = auth.uid()
  LEFT JOIN LATERAL (
    SELECT m.mensagem, m.created_at, m.tipo, m.status
    FROM public.whats_mensagens_conversa m
    WHERE m.whats_conversa_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt
    FROM public.whats_mensagens_conversa m
    WHERE m.whats_conversa_id = c.id
      AND m.status = 'Recebida'
      AND COALESCE(m.visto, false) = false
  ) uc ON TRUE
  WHERE c.companies_id = p_company_id
  ORDER BY (cp.conversa_id IS NOT NULL) DESC, COALESCE(lm.created_at, c.created_at) DESC;
$function$;

grant execute on function public.chat_list(uuid) to anon, authenticated, service_role;

commit;

-- ============================================================================
-- ROLLBACK:
--   begin;
--   drop function if exists public.chat_list(uuid);
--   -- recriar chat_list sem a coluna `fixada` (versão anterior, migration chat_archive).
--   drop table if exists public.chat_pins;
--   commit;
-- ============================================================================
