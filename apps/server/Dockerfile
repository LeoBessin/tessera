# syntax=docker/dockerfile:1

# Built from the repository root so the workspace and lockfile are in context:
#   docker build -f apps/server/Dockerfile .

FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app
ENV CI=true

FROM base AS build
# Manifests first: this layer is cached until a dependency actually changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/sim/package.json ./packages/sim/
COPY packages/protocol/package.json ./packages/protocol/
COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/
RUN pnpm install --frozen-lockfile --filter @tessera/server...

COPY packages ./packages
COPY apps/server ./apps/server
RUN pnpm --filter @tessera/server build

# `deploy` resolves the workspace links into a self-contained production tree.
RUN pnpm --filter @tessera/server deploy --prod --legacy /deploy

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=2567

# The simulation is deterministic and the server holds no local state, so there
# is nothing here that needs to run as root.
USER node

COPY --from=build --chown=node:node /deploy/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/server/dist ./dist

EXPOSE 2567

# Colyseus answers matchmaking over plain HTTP, which doubles as a liveness probe.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||2567)+'/matchmake/campaign').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.mjs"]
