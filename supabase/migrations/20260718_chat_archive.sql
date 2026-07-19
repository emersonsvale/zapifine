-- ============================================================================
-- FEATURE: Arquivar conversas em /multiatendimento/chats.
--
-- Regras (definidas pelo produto):
--   * Conversa pode ser arquivada manualmente pelo atendente.
--   * Chat arquivado NÃO aparece em Todas/Minhas/Sem atendente/Setor — só na
--     nova aba "Arquivadas".
--   * Se chegar uma NOVA mensagem RECEBIDA (do lead) num chat arquivado, ele é
--     desarquivado automaticamente e volta pra Todas.
--
-- Implementação:
--   1. Colunas `arquivada` (bool) + `arquivada_em` (timestamptz) em whats_conversa.
--   2. Índice parcial p/ a aba Arquivadas e p/ o filtro das abas normais.
--   3. chat_list passa a expor `arquivada` (client filtra as abas).
--   4. Trigger AFTER INSERT em whats_mensagens_conversa: msg 'Recebida' num chat
--      arquivado -> desarquiva. SECURITY DEFINER (owner postgres, BYPASSRLS) para
--      contornar a policy RESTRICTIVE `origin_gate_write_upd` (gateway CF), já que
--      o UPDATE do trigger não carrega os headers do gateway.
-- ============================================================================

begin;

-- ========================= 1. colunas =========================
alter table public.whats_conversa
  add column if not exists arquivada    boolean     not null default false,
  add column if not exists arquivada_em timestamptz;

-- Índice parcial: só linhas arquivadas (aba Arquivadas é subconjunto pequeno).
create index if not exists idx_whats_conversa_arquivada
  on public.whats_conversa (companies_id)
  where arquivada;

-- ========================= 2. chat_list =========================
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
    arquivada boolean
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
    COALESCE(c.arquivada, false) AS arquivada
  FROM public.whats_conversa c
  LEFT JOIN public.leads l ON l.id = c.lead_id
  LEFT JOIN public.users au ON au.id = c.assigned_to
  LEFT JOIN public.setores s ON s.id = c.setor_id
  LEFT JOIN public.whatsapp_connections wc ON wc.id = c.whatsapp_connection_id
  LEFT JOIN public.ff_funil f ON f.id = l.funil_id
  LEFT JOIN public.ff_colunas_funil fc ON fc.id = l.coluna_id
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
  ORDER BY COALESCE(lm.created_at, c.created_at) DESC;
$function$;

-- Grants iguais aos da função original.
grant execute on function public.chat_list(uuid) to anon, authenticated, service_role;

-- ========================= 3. trigger auto-desarquivar =========================
create or replace function public.unarchive_on_incoming_message()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  -- Só mensagens recebidas (do lead) desarquivam. Mensagens enviadas pela
  -- equipe/automação não trazem o chat de volta.
  if new.status = 'Recebida' and new.whats_conversa_id is not null then
    update public.whats_conversa
      set arquivada = false,
          arquivada_em = null
      where id = new.whats_conversa_id
        and arquivada = true;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_unarchive_on_incoming on public.whats_mensagens_conversa;
create trigger trg_unarchive_on_incoming
  after insert on public.whats_mensagens_conversa
  for each row
  execute function public.unarchive_on_incoming_message();

commit;

-- ============================================================================
-- ROLLBACK (se precisar reverter):
--   begin;
--   drop trigger if exists trg_unarchive_on_incoming on public.whats_mensagens_conversa;
--   drop function if exists public.unarchive_on_incoming_message();
--   drop function if exists public.chat_list(uuid);
--   -- recriar chat_list sem a coluna `arquivada` (versão anterior).
--   drop index if exists public.idx_whats_conversa_arquivada;
--   alter table public.whats_conversa
--     drop column if exists arquivada,
--     drop column if exists arquivada_em;
--   commit;
-- ============================================================================
