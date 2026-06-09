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

-- Settings (rodar manualmente apos aplicar a migration):
--   ALTER DATABASE postgres SET app.push_webhook_url = 'https://app.zapifine.com/api/push/dispatch';
--   ALTER DATABASE postgres SET app.push_webhook_secret = '<CRON_SECRET>';

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

  BEGIN
    v_url := current_setting('app.push_webhook_url', true);
    v_secret := current_setting('app.push_webhook_secret', true);
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

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
