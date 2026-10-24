# Imagen de PRODUCCIÓN de Trust.
#
# Un target:
#   api -> dist/main.js (Nest: HTTP + SSE)
#
# Build:
#   podman build -t localhost/trust-api .
#
# Compatible con Podman/Buildah: solo usa multi-stage y COPY --from.

# ---------- base ----------
# Alpine + Node 26. libc6-compat y openssl cubren binarios precompilados.
FROM node:26-alpine AS base
RUN apk add --no-cache bash libc6-compat openssl
RUN npm install -g pnpm@12.3.4
WORKDIR /app

# NODE_ENV no se fija aquí: el stage de build necesita devDependencies.
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

# ---------- deps ----------
# Todas las dependencias, solo para construir. Se copian primero los
# package.json para cachear la capa mientras cambia el código.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json web/
RUN pnpm install --frozen-lockfile

# ---------- build ----------
# Backend con rspack (dist/main.js) y front con Vite+.
FROM deps AS build
COPY . .
RUN pnpm build && pnpm build:web

# ---------- prod-deps ----------
# Segundo install SIN devDependencies: el prune real. La imagen final no
# lleva TypeScript, Vite+, Vitest, Oxlint ni Oxfmt.
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json web/
RUN pnpm install --frozen-lockfile --prod

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/web/dist ./web/dist
COPY --from=build /app/package.json ./package.json

COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# ---------- api ----------
# Nest sirve la API y el stream SSE.
FROM runtime AS api
ENV SERVICE=api
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["/usr/local/bin/start.sh"]
