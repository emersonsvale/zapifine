-- Revoga execute das RPCs de multi funis para o role anon (advisor 0028/0029).
-- Apenas usuários autenticados devem chamar essas RPCs.

revoke execute on function public.create_funil_with_defaults(text) from anon;
revoke execute on function public.delete_funil_and_move_leads(int, int) from anon;
