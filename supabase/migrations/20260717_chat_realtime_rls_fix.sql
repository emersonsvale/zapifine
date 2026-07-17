-- ============================================================================
-- FIX: /multiatendimento/chats não atualiza em tempo real.
--
-- CAUSA RAIZ (confirmada em produção):
--   A policy RESTRICTIVE `origin_gate_write` está como FOR ALL, então ela também
--   gateia SELECT. O Supabase Realtime avalia a RLS server-side, SEM o header do
--   Cloudflare Worker (x-zapifine-gw) e sem Origin. Logo:
--       security.gateway_ok()  -> false   (não há header)
--       security.origin_ok()   -> false   (não há Origin)
--   RLS final de SELECT = (permissive) AND (restrictive) = ... AND false = FALSE.
--   Resultado: TODO evento postgres_changes de whats_mensagens_conversa /
--   whats_conversa é descartado -> mensagem nova só aparece após refresh manual.
--   (whats_presence não tem esse gate; por isso "digitando..." funciona.)
--
-- CORREÇÃO:
--   1. `origin_gate_write` passa a gatear SÓ escrita (INSERT/UPDATE/DELETE).
--      Segurança de escrita via gateway CF permanece intacta.
--   2. Remove `realtime_select_* = true` (footgun: se o gate de SELECT saísse, o
--      `true` exporia dados de TODOS os tenants). SELECT passa a ser regido apenas
--      pelas policies `*_all_by_company` (companies_id = current_company_id()),
--      que são multi-tenant safe E funcionam no realtime (dependem só de auth.uid()).
--
-- Escopo: só as 2 tabelas do chat. leads / notifications / whatsapp_connections
-- têm o MESMO bug e serão tratadas numa migration separada após auditoria do
-- SELECT de cada uma.
-- ============================================================================

begin;

-- ========================= whats_conversa =========================
-- SELECT seguro que sobra: whats_conversa_all_by_company (companies_id = current_company_id())
drop policy if exists realtime_select_whats_conversa on public.whats_conversa;
drop policy if exists origin_gate_write              on public.whats_conversa;
drop policy if exists origin_gate_write_ins          on public.whats_conversa;
drop policy if exists origin_gate_write_upd          on public.whats_conversa;
drop policy if exists origin_gate_write_del          on public.whats_conversa;

create policy origin_gate_write_ins on public.whats_conversa
  as restrictive for insert to public
  with check (security.origin_ok() and security.gateway_ok());

create policy origin_gate_write_upd on public.whats_conversa
  as restrictive for update to public
  using       (security.origin_ok() and security.gateway_ok())
  with check  (security.origin_ok() and security.gateway_ok());

create policy origin_gate_write_del on public.whats_conversa
  as restrictive for delete to public
  using (security.origin_ok() and security.gateway_ok());

-- ==================== whats_mensagens_conversa ====================
-- SELECT seguro que sobra: whats_msgs_all_by_company (via whats_conversa/leads + current_company_id())
drop policy if exists realtime_select_whats_mensagens_conversa on public.whats_mensagens_conversa;
drop policy if exists origin_gate_write                        on public.whats_mensagens_conversa;
drop policy if exists origin_gate_write_ins                    on public.whats_mensagens_conversa;
drop policy if exists origin_gate_write_upd                    on public.whats_mensagens_conversa;
drop policy if exists origin_gate_write_del                    on public.whats_mensagens_conversa;

create policy origin_gate_write_ins on public.whats_mensagens_conversa
  as restrictive for insert to public
  with check (security.origin_ok() and security.gateway_ok());

create policy origin_gate_write_upd on public.whats_mensagens_conversa
  as restrictive for update to public
  using       (security.origin_ok() and security.gateway_ok())
  with check  (security.origin_ok() and security.gateway_ok());

create policy origin_gate_write_del on public.whats_mensagens_conversa
  as restrictive for delete to public
  using (security.origin_ok() and security.gateway_ok());

commit;

-- ============================================================================
-- ROLLBACK (se precisar reverter):
--   begin;
--   drop policy if exists origin_gate_write_ins on public.whats_conversa;
--   drop policy if exists origin_gate_write_upd on public.whats_conversa;
--   drop policy if exists origin_gate_write_del on public.whats_conversa;
--   create policy origin_gate_write on public.whats_conversa as restrictive for all to public
--     using (security.origin_ok() and security.gateway_ok())
--     with check (security.origin_ok() and security.gateway_ok());
--   create policy realtime_select_whats_conversa on public.whats_conversa for select to authenticated using (true);
--   -- (idem para whats_mensagens_conversa)
--   commit;
-- ============================================================================
