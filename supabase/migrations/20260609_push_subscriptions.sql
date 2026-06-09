-- Web Push subscriptions (PWA / browser push)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON public.push_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS push_subscriptions_company_idx
  ON public.push_subscriptions (company_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_select_own
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_insert_own
  ON public.push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_delete_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_delete_own
  ON public.push_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- pg_net extension para chamar o endpoint Nitro de dentro do trigger
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Tabela de configuracao (Supabase managed nao permite ALTER DATABASE)
CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- sem policies para authenticated: so service_role acessa

-- Settings (rodar manualmente apos aplicar a migration):
--   INSERT INTO public.app_config (key, value) VALUES
--     ('push_webhook_url', 'https://app.zapifine.com/api/push/dispatch'),
--     ('push_webhook_secret', '<CRON_SECRET>')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

CREATE OR REPLACE FUNCTION public.fn_push_dispatch_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'Recebida' THEN
    RETURN NEW;
  END IF;

  SELECT value INTO v_url FROM public.app_config WHERE key = 'push_webhook_url';
  SELECT value INTO v_secret FROM public.app_config WHERE key = 'push_webhook_secret';

  IF v_url IS NULL OR v_url = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-zapifine-cron', COALESCE(v_secret, '')
    ),
    body := jsonb_build_object(
      'message_id', NEW.id,
      'conversa_id', NEW.whats_conversa_id,
      'tipo', NEW.tipo,
      'mensagem', NEW.mensagem
    ),
    timeout_milliseconds := 4000
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_dispatch_on_new_message ON public.whats_mensagens_conversa;
CREATE TRIGGER trg_push_dispatch_on_new_message
  AFTER INSERT ON public.whats_mensagens_conversa
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_push_dispatch_on_new_message();
