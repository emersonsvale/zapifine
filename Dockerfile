# syntax=docker/dockerfile:1.7

# ─── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable

WORKDIR /app

# Força modo dev no build (ignora NODE_ENV=production externo do Coolify)
# devDependencies (nuxt, vite, typescript) são necessárias para build
ENV NODE_ENV=development \
    NODE_OPTIONS=--max-old-space-size=6144 \
    NITRO_MINIFY=false

# Build args para vars inlined no bundle client (Supabase URL/KEY, Meta, WhatsApp public)
ARG SUPABASE_URL
ARG SUPABASE_KEY
ARG META_APP_ID
ARG META_CONFIG_ID
ARG META_GRAPH_VERSION
ARG WHATS_API_URL
ARG VAPID_PUBLIC_KEY

ENV SUPABASE_URL=${SUPABASE_URL} \
    SUPABASE_KEY=${SUPABASE_KEY} \
    META_APP_ID=${META_APP_ID} \
    META_CONFIG_ID=${META_CONFIG_ID} \
    META_GRAPH_VERSION=${META_GRAPH_VERSION} \
    WHATS_API_URL=${WHATS_API_URL} \
    VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}

# Dependências primeiro pra cache
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# Código
COPY . .

RUN pnpm build

# ─── Runtime stage ────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NITRO_PORT=3000 \
    NITRO_HOST=0.0.0.0

COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
