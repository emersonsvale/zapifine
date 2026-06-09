# Web Push (notificação com app fechado)

## 1. Instalar dependência

```bash
pnpm install
```

Adiciona `web-push` + `@types/web-push`.

## 2. Gerar par de chaves VAPID

```bash
npx web-push generate-vapid-keys --json
```

Saída:

```json
{
  "publicKey": "B...",
  "privateKey": "..."
}
```

## 3. Variáveis de ambiente

Adicione no `.env` (e nos secrets de produção):

```
VAPID_PUBLIC_KEY=<publicKey>
VAPID_PRIVATE_KEY=<privateKey>
VAPID_SUBJECT=mailto:suporte@zapifine.com
CRON_SECRET=<gere um valor forte, ex: openssl rand -hex 32>
```

A `VAPID_PUBLIC_KEY` é exposta no `runtimeConfig.public` (necessário no
navegador para `pushManager.subscribe`).

## 4. Aplicar migration

```bash
supabase db push
# ou
supabase migration up
```

Migration: `supabase/migrations/20260609_push_subscriptions.sql`.

Cria:
- Tabela `public.push_subscriptions` (RLS por `user_id = auth.uid()`).
- Extensão `pg_net`.
- Função `fn_push_dispatch_on_new_message()` + trigger
  `trg_push_dispatch_on_new_message` em `whats_mensagens_conversa`.

## 5. Configurar URL do webhook no banco

Supabase managed não permite `ALTER DATABASE SET`. Use a tabela
`public.app_config` (criada na migration, acessível só via service role):

```sql
INSERT INTO public.app_config (key, value) VALUES
  ('push_webhook_url', 'https://app.zapifine.com/api/push/dispatch'),
  ('push_webhook_secret', '<CRON_SECRET>')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
```

Para dev local, troque a URL pelo seu túnel (ngrok / cloudflared) apontando
para o Nuxt local. Sem essas settings, o trigger é noop (não quebra inserts).

## 6. Endpoints

- `GET  /api/push/public-key` — devolve a chave pública (fallback se o
  cliente não tiver `runtimeConfig.public.vapidPublicKey`).
- `POST /api/push/subscribe` — salva subscription do usuário autenticado.
- `POST /api/push/unsubscribe` — remove subscription.
- `POST /api/push/dispatch` — interno, exige header `x-zapifine-cron`
  igual a `CRON_SECRET`. Chamado pelo trigger via `pg_net`.

## 7. Fluxo

1. Usuário entra em `Configurações → Notificações` e clica em
   **Ativar push neste dispositivo**.
2. Browser pede permissão → registra `/sw.js` → `pushManager.subscribe()`
   → `POST /api/push/subscribe`.
3. Nova mensagem entra em `whats_mensagens_conversa` com
   `status='Recebida'` → trigger chama `/api/push/dispatch`.
4. Endpoint busca todas as subscriptions da `company_id` da conversa e
   dispara web push via `web-push`.
5. Service Worker recebe `push` e mostra notificação do SO (mesmo com a
   aba/app fechado). Clique → foca aba existente ou abre nova em
   `/multiatendimento/chats?conv=<id>`.

## 8. Limitações

- iOS Safari: só suporta web push em PWAs **instaladas na tela inicial**
  (Add to Home Screen). Em browser comum o `pushManager.subscribe` falha.
- Som personalizado no push do SO depende do browser/OS. Chrome desktop
  ignora `sound` no `showNotification`. Para som garantido, o
  `chats-realtime.client.ts` já toca `bipmensagem.mpeg` enquanto a aba
  existir. Push do SW serve para o caso "app totalmente fechado".
- Subscriptions expiram (404/410). O dispatch remove automaticamente
  ao detectar.
