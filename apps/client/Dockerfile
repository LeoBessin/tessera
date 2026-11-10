# syntax=docker/dockerfile:1

# Built from the repository root:
#   docker build -f apps/client/Dockerfile .

FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /app
ENV CI=true

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/sim/package.json ./packages/sim/
COPY packages/protocol/package.json ./packages/protocol/
COPY apps/client/package.json ./apps/client/
COPY apps/server/package.json ./apps/server/
RUN pnpm install --frozen-lockfile --filter @tessera/client...

COPY packages ./packages
COPY apps/client ./apps/client

# Vite inlines env vars at build time, so the server URL is baked into the
# bundle here rather than read at runtime. Changing it means rebuilding.
ARG VITE_SERVER_URL=ws://localhost:2567
ENV VITE_SERVER_URL=${VITE_SERVER_URL}
RUN pnpm --filter @tessera/client build

FROM nginx:1.29-alpine AS runtime
COPY --from=build /app/apps/client/dist /usr/share/nginx/html
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
