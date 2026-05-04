-- 1. Avatares no whats_conversa (foto de grupos / DM)
ALTER TABLE public.whats_conversa
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS avatar_fetched_at timestamptz;

-- 2. Participantes (cache de pushName + avatar por jid)
CREATE TABLE IF NOT EXISTS public.whats_participantes (
  companies_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  jid text NOT NULL,
  nome text,
  avatar_url text,
  avatar_fetched_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (companies_id, jid)
);

CREATE INDEX IF NOT EXISTS whats_participantes_companies_idx
  ON public.whats_participantes (companies_id);

ALTER TABLE public.whats_participantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whats_participantes_select_company ON public.whats_participantes;
CREATE POLICY whats_participantes_select_company
  ON public.whats_participantes
  FOR SELECT
  TO authenticated
  USING (
    companies_id IN (
      SELECT u.companie_id FROM public.users u WHERE u.id = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.whats_participantes;
