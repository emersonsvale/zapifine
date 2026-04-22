# Zapifine

Chatbot inteligente para WhatsApp com CRM, agenda, follow-up e multiatendimento. Stack Nuxt 4 + Supabase + Stripe.

## Stack

- **Frontend/SSR:** Nuxt 4, Vue 3, Tailwind 4, shadcn-vue
- **Backend:** Supabase (Postgres + Auth + Edge Functions + Realtime)
- **Pagamentos:** Stripe (checkout, billing portal, webhooks via Edge Functions)
- **Integrações:** Meta WhatsApp Cloud API, Google Calendar (via n8n)

## Desenvolvimento

```bash
pnpm install
cp .env.example .env   # preencher segredos
pnpm dev               # http://localhost:3000
pnpm typecheck         # validação TS
pnpm build             # .output pronto pra produção
```

## Variáveis de ambiente

Ver `.env.example`. Obrigatórias em produção:

| Variável | Origem |
|---|---|
| `SUPABASE_URL` | Supabase > Project Settings > API |
| `SUPABASE_KEY` | publishable anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role secret (server-only) |
| `SUPABASE_GW_SECRET` | `security.gateway_secrets` name=`cf_worker` |
| `META_APP_ID` / `META_CONFIG_ID` / `META_APP_SECRET` | Meta for Developers |

## Deploy — Coolify

1. **New Resource** > **Application** > selecionar este repo (`main` branch).
2. **Build Pack:** Dockerfile.
3. **Port:** `3000` (exposto no container).
4. **Environment Variables:** copiar de `.env.example`, preencher segredos.
5. **Health Check Path:** `/` (Nuxt responde 200).
6. **Domínio:** configurar FQDN + Let's Encrypt.
7. Deploy.

Rebuild automático via GitHub webhook (Coolify configura sozinho).

### Notas

- Dockerfile usa `node:20-alpine`, build multi-stage, roda `.output/server/index.mjs` na porta `3000`.
- Nitro preset fixado em `node-server` pra compatibilidade Docker.
- Rotas protegidas: middleware global [onboarding.global.ts](app/middleware/onboarding.global.ts) redireciona `is_onboarding_complete=false` pra `/onboarding`.
- RLS Supabase exige headers `Origin` válido + `x-zapifine-gw` com secret — CF Worker injeta em prod, dev usa `SUPABASE_GW_SECRET` direto.
