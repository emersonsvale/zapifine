# syntax=docker/dockerfile:1.7

# ─── Build stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Dependências primeiro pra cache
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Código
COPY . .

# Build (Nitro gera .output com node-server default)
RUN pnpm build

# ─── Runtime stage ────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NITRO_PORT=3000 \
    NITRO_HOST=0.0.0.0

COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
