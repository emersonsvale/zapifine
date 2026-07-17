-- ============================================================================
-- FIX (fase 2): realtime quebrado em leads / notifications / whatsapp_connections.
--
-- Mesma causa do chat: a policy RESTRICTIVE `origin_gate_write` está FOR ALL,
-- gateando SELECT. Realtime avalia RLS sem o header do CF Worker -> gateway_ok()
-- = false -> eventos descartados.
--
-- Diferente do chat, estas 3 tabelas NÃO têm policy `realtime_select_* = true`,
-- então basta converter o gate para writes-only. O SELECT continua regido pela
-- respectiva policy `*_all_by_company` (company-scoped, multi-tenant safe).
-- ============================================================================

begin;

-- ============================= leads =============================
drop policy if exists origin_gate_write     on public.leads;
drop policy if exists origin_gate_write_ins on public.leads;
drop policy if exists origin_gate_write_upd on public.leads;
drop policy if exists origin_gate_write_del on public.leads;
create policy origin_gate_write_ins on public.leads
  as restrictive for insert to public
  with check (security.origin_ok() and security.gateway_ok());
create policy origin_gate_write_upd on public.leads
  as restrictive for update to public
  using      (security.origin_ok() and security.gateway_ok())
  with check (security.origin_ok() and security.gateway_ok());
create policy origin_gate_write_del on public.leads
  as restrictive for delete to public
  using (security.origin_ok() and security.gateway_ok());

-- ========================= notifications =========================
drop policy if exists origin_gate_write     on public.notifications;
drop policy if exists origin_gate_write_ins on public.notifications;
drop policy if exists origin_gate_write_upd on public.notifications;
drop policy if exists origin_gate_write_del on public.notifications;
create policy origin_gate_write_ins on public.notifications
  as restrictive for insert to public
  with check (security.origin_ok() and security.gateway_ok());
create policy origin_gate_write_upd on public.notifications
  as restrictive for update to public
  using      (security.origin_ok() and security.gateway_ok())
  with check (security.origin_ok() and security.gateway_ok());
create policy origin_gate_write_del on public.notifications
  as restrictive for delete to public
  using (security.origin_ok() and security.gateway_ok());

-- ====================== whatsapp_connections ======================
drop policy if exists origin_gate_write     on public.whatsapp_connections;
drop policy if exists origin_gate_write_ins on public.whatsapp_connections;
drop policy if exists origin_gate_write_upd on public.whatsapp_connections;
drop policy if exists origin_gate_write_del on public.whatsapp_connections;
create policy origin_gate_write_ins on public.whatsapp_connections
  as restrictive for insert to public
  with check (security.origin_ok() and security.gateway_ok());
create policy origin_gate_write_upd on public.whatsapp_connections
  as restrictive for update to public
  using      (security.origin_ok() and security.gateway_ok())
  with check (security.origin_ok() and security.gateway_ok());
create policy origin_gate_write_del on public.whatsapp_connections
  as restrictive for delete to public
  using (security.origin_ok() and security.gateway_ok());

commit;
