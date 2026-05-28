FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS pruner
COPY . .
RUN bunx turbo prune --scope=@proxy/api --docker

FROM base AS builder
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN bunx turbo run build --filter=@proxy/api

FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/proxy/package.json ./apps/proxy/package.json
COPY --from=builder /app/apps/proxy/dist ./apps/proxy/dist
COPY --from=builder /app/apps/proxy/drizzle ./apps/proxy/drizzle

RUN mkdir -p /app/apps/proxy/logs && chown -R bun:bun /app

USER bun
EXPOSE 3000
CMD ["bun", "run", "--cwd", "apps/proxy", "start"]
