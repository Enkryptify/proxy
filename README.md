# proxy

Enkryptify secret-injecting HTTP proxy. Built with [Hono](https://hono.dev) on [Bun](https://bun.com).

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FEnkryptify%2Fproxy&project-name=enkryptify-proxy&repository-name=enkryptify-proxy&root-directory=apps%2Fproxy&env=DATABASE_URL,DATABASE_LOGGING,DATABASE_MIGRATE_ON_START,PROXY_KEY,JWT_ACCESS_SECRET,JWT_REFRESH_SECRET,ENABLE_ADMIN_WEB&envDescription=Set%20ENABLE_ADMIN_WEB%3Dfalse%20for%20proxy-only.%20Inject%20secrets%20via%20Enkryptify.)

Runs on Vercel's Bun runtime via [`bunVersion: 1.x`](https://bun.com/docs/guides/deployment/vercel) in `apps/proxy/vercel.json`.

**Vercel project settings**

| Setting | Value |
|--------|--------|
| Root Directory | `apps/proxy` |
| Install / Build | Handled by `vercel.json` (`cd ../.. && bun install` / `bun run build:vercel`) |
| Production branch | `main` (after the stacked PRs are merged) |

The monorepo build (`bun run build:vercel` from the repo root) uses Turbo to:

1. Always bundle the proxy → `apps/proxy/api/index.js`
2. Optionally build the admin SPA → `apps/proxy/public-admin/` when `ENABLE_ADMIN_WEB` is not `false`

**`ENABLE_ADMIN_WEB`** (Vercel → Environment Variables)

| Value | Result |
|-------|--------|
| unset or `true` | Proxy + admin panel on the same domain (`/login`, `/`, `/api/*`, proxy tunnel on `/{workspace}/…`) |
| `false` | Proxy only (all traffic routes to the Bun handler via the catch-all rewrite) |

When the panel is enabled, set `ADMIN_WEB_ORIGINS` to your Vercel URL (e.g. `https://your-app.vercel.app`), `COOKIE_SECURE=true`, and inject `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PROXY_KEY`, and `DATABASE_URL` via Enkryptify.

## Local development

Configure secrets through [Enkryptify](https://docs.enkryptify.com/cli/quickstart) — do not commit `.env` files:

```sh
# From the monorepo root:
bun install
ek run -- bun run db:migrate
ek run -- bun run admin:create -- --email you@example.com --username you --password '<strong>'

ek run -- bun run dev                                  # proxy :3000 + panel :5173
ENABLE_ADMIN_WEB=false ek run -- bun run dev           # proxy only
```

Required proxy env vars (injected by `ek run` or your secret store):

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — min. 32 characters each, must differ
- `PROXY_KEY` — Enkryptify API token for vault workspace resolve

Health check: `curl http://localhost:3000/health`

## Manual deploy

```sh
bun install
ek run -- bun run build:vercel
ENABLE_ADMIN_WEB=false ek run -- bun run build:vercel   # proxy only

cd apps/proxy && bunx vercel deploy --prod
```

## Admin panel (`apps/web`)

React/Vite SPA that talks to the proxy via `/api/auth/*` and `/api/admin/*`. The
JWT lives only in memory (never `localStorage`/`sessionStorage`); a 30-day
`httpOnly` refresh cookie restores the session on cold start and a silent refresh
runs 60s before the access token expires.

### Screens

- **Dashboard** — `/health` status, request counts, average + p95 response time
- **Whitelist** — per-workspace allow-list of upstream hostnames
- **Logs** — paginated tunnel-log table
- **Settings** — whitelist-mode toggle

### Production deploy (Vercel, same project)

With `ENABLE_ADMIN_WEB` enabled, the panel is built into `apps/proxy/public-admin/`
on the same origin; leave `VITE_API_BASE_URL` empty.

To host the panel on a **separate** origin, set `ENABLE_ADMIN_WEB=false`, deploy
`apps/web` elsewhere, set `VITE_API_BASE_URL` to the proxy URL, and add the panel
origin to `ADMIN_WEB_ORIGINS`.
