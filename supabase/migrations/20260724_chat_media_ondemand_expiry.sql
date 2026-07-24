-- ============================================================================
-- FEATURE: mídia sob demanda (opt-in) + expiração de arquivos do storage.
--
-- Objetivo (definido pelo produto):
--   1. Não encher o storage com toda mídia recebida. Mídia PESADA (vídeo e
--      documento) NÃO é baixada automaticamente: fica "pendente" e o atendente
--      decide se quer baixar (botão na conversa). Imagem e áudio continuam
--      automáticos (leves, uso comum).
--   2. Todo arquivo do bucket `chat-media` só pode ficar 3 meses (90 dias).
--      Depois é excluído pra minimizar custo; a mensagem fica na thread marcada
--      como "arquivo expirado".
--
-- Colunas novas em whats_mensagens_conversa:
--   * midia_pendente  -> mídia existe na fonte (WhatsApp/provider) mas ainda NÃO
--                        foi baixada pro storage. Front mostra botão "Baixar".
--   * midia_mime      -> mimetype guardado no ingest (ícone/preview do card).
--   * midia_nome      -> filename original (documentos).
--   * midia_expirada  -> arquivo já foi purgado após 90 dias.
--
-- A whats-api (ingest) grava midia_pendente=true pra vídeo/doc; a rota
-- /media/fetch baixa sob demanda e grava midia_url + midia_pendente=false.
-- O cron de purge zera midia_url e marca midia_expirada=true.
-- ============================================================================

begin;

alter table public.whats_mensagens_conversa
  add column if not exists midia_pendente boolean not null default false,
  add column if not exists midia_mime     text,
  add column if not exists midia_nome     text,
  add column if not exists midia_expirada boolean not null default false;

-- Índice parcial p/ o cron de purge: só linhas que ainda têm arquivo no storage.
-- Ordena por created_at pra varrer as mais antigas primeiro.
create index if not exists idx_whats_msg_midia_purge
  on public.whats_mensagens_conversa (created_at)
  where midia_url is not null;

commit;

-- ============================================================================
-- ROLLBACK:
--   begin;
--   drop index if exists public.idx_whats_msg_midia_purge;
--   alter table public.whats_mensagens_conversa
--     drop column if exists midia_pendente,
--     drop column if exists midia_mime,
--     drop column if exists midia_nome,
--     drop column if exists midia_expirada;
--   commit;
-- ============================================================================
