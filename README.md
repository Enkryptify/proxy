# proxy

Enkryptify secret-injecting HTTP proxy. Built with [Hono](https://hono.dev) on [Bun](https://bun.com).

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FEnkryptify%2Fproxy&project-name=enkryptify-proxy&repository-name=enkryptify-proxy&root-directory=apps%2Fproxy&env=DATABASE_URL,DATABASE_LOGGING,DATABASE_MIGRATE_ON_START&envDescription=Optional%20%E2%80%94%20leave%20blank%20to%20deploy%20without%20DB%20tunnel%20logging.&envLink=https%3A%2F%2Fgithub.com%2FEnkryptify%2Fproxy%2Fblob%2Fmain%2Fapps%2Fproxy%2F.env.example)

Runs on Vercel's Bun runtime via [`bunVersion: 1.x`](https://bun.com/docs/guides/deployment/vercel) in `apps/proxy/vercel.json`. The button pre-fills:

- Root Directory: `apps/proxy`
- Environment variables (all optional)

## Local development

```sh
cd apps/proxy
bun install
cp .env.example .env
bun run dev
```

Health check: `curl http://localhost:3000/health`

## Manual deploy

```sh
cd apps/proxy
bun run deploy:vercel
```

This bundles `src/index.ts` → `api/index.js` and pushes to Vercel. The bundled file is committed so the deploy button works without a build step on Vercel.

After changing source code:

```sh
cd apps/proxy
bun run build:vercel
git add api/index.js
git commit
```

## Admin panel (`apps/web`)

React/Vite SPA that talks to the proxy via `/api/auth/*` and `/api/admin/*`. The
JWT lives only in memory (never `localStorage`/`sessionStorage`); a 30-day
`httpOnly` refresh cookie restores the session on cold start and a silent refresh
runs 60s before the access token expires.

### Local development

```sh
# From the monorepo root:
bun install
cp apps/proxy/.env.example apps/proxy/.env   # set DATABASE_URL + JWT_*_SECRET
bun run db:migrate
bun run admin:create -- --email you@example.com --username you --password '<strong>'

# Terminal 1 — proxy backend
cd apps/proxy && bun run dev                 # http://localhost:3000

# Terminal 2 — admin panel
cd apps/web && bun run dev                   # http://localhost:5173, proxies /api → :3000
```

> Using Enkryptify? Prefix any of the above with `ek run`
> (e.g. `ek run bun run admin:create -- --email ...`) and the secrets are injected into the env.

### Screens

- **Dashboard** — `/health` status, request counts, average + p95 response time
  for the selected workspace over the last 24 h.
- **Whitelist** — per-workspace allow-list of upstream hostnames, with toggle
  for whitelist-mode enforcement.
- **Logboek** — paginated tunnel-log table (destination host, status, duration,
  referenced secret keys — values are never persisted or shown).
- **Instellingen** — toggles per workspace, currently whitelist-mode.

### Production deploy

The web app builds to `apps/web/dist/` and can be served by any static host
(Vercel, S3+CloudFront, Nginx). Set `VITE_API_BASE_URL` at build time if the
admin panel is hosted on a different origin than the proxy, and add that
origin to the proxy's `ADMIN_WEB_ORIGINS` env var so CORS + cookies work.
