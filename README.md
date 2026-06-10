# proxy

Enkryptify secret-injecting HTTP proxy. Built with [Hono](https://hono.dev) on [Bun](https://bun.com).

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FEnkryptify%2Fproxy&project-name=enkryptify-proxy&repository-name=enkryptify-proxy&root-directory=apps%2Fproxy&env=DATABASE_URL,DATABASE_LOGGING,DATABASE_MIGRATE_ON_START,PROXY_KEY,ENKRYPTIFY_API_URL,JWT_ACCESS_SECRET,JWT_REFRESH_SECRET,JWT_ACCESS_TTL_SECONDS,JWT_REFRESH_TTL_SECONDS,ADMIN_WEB_ORIGINS,COOKIE_SECURE,ENABLE_ADMIN_WEB,NODE_ENV,PORT&envDescription=Replace%20placeholder%20secrets%20before%20deploying.%20Set%20ENABLE_ADMIN_WEB%3Dfalse%20for%20proxy-only%20(no%20dashboard).%20Set%20ADMIN_WEB_ORIGINS%20to%20your%20Vercel%20URL%20when%20the%20panel%20is%20enabled.&envDefaults=%7B%22DATABASE_URL%22%3A%22postgres%3A%2F%2Fuser%3Apassword%40ep-example.region.aws.neon.tech%3A5432%2Fproxy%3Fsslmode%3Drequire%22%2C%22DATABASE_LOGGING%22%3A%22true%22%2C%22DATABASE_MIGRATE_ON_START%22%3A%22true%22%2C%22PROXY_KEY%22%3A%22ek_live_replace_with_your_enkryptify_token%22%2C%22ENKRYPTIFY_API_URL%22%3A%22https%3A%2F%2Fapi.enkryptify.com%22%2C%22JWT_ACCESS_SECRET%22%3A%22replace-with-a-random-32-character-string%22%2C%22JWT_REFRESH_SECRET%22%3A%22replace-with-a-different-32-char-string%22%2C%22JWT_ACCESS_TTL_SECONDS%22%3A%22900%22%2C%22JWT_REFRESH_TTL_SECONDS%22%3A%222592000%22%2C%22ADMIN_WEB_ORIGINS%22%3A%22https%3A%2F%2Fenkryptify-proxy.vercel.app%22%2C%22COOKIE_SECURE%22%3A%22true%22%2C%22ENABLE_ADMIN_WEB%22%3A%22true%22%2C%22NODE_ENV%22%3A%22production%22%2C%22PORT%22%3A%223000%22%7D)

Runs on Vercel's Bun runtime via [`bunVersion: 1.x`](https://bun.com/docs/guides/deployment/vercel) in `apps/proxy/vercel.json`.

**Vercel project settings**

| Setting | Value |
|--------|--------|
| Root Directory | `apps/proxy` |
| Install / Build | Handled by `vercel.json` (`cd ../.. && bun install` / `bun run build:vercel`) |
| Production branch | `main` |

The Deploy button pre-fills every environment variable below. **Replace the placeholder secrets** (`DATABASE_URL`, `PROXY_KEY`, `JWT_*`) before going live.

### Environment variables

| Variable | Example | Required | Description |
|----------|---------|:--------:|-------------|
| `DATABASE_URL` | `postgres://user:pass@host:5432/proxy?sslmode=require` | Yes (admin panel) | PostgreSQL for users, whitelist, tunnel logs |
| `DATABASE_LOGGING` | `true` | No | Write tunnel requests to `tunnel_log` |
| `DATABASE_MIGRATE_ON_START` | `true` | No | Run Drizzle migrations on cold start |
| `PROXY_KEY` | `ek_live_…` | Yes (admin + vault) | Enkryptify API token — resolves workspace |
| `ENKRYPTIFY_API_URL` | `https://api.enkryptify.com` | No | Vault base URL |
| `JWT_ACCESS_SECRET` | `random-32+-char-string` | Yes (admin panel) | HMAC secret for access tokens (min. 32 chars) |
| `JWT_REFRESH_SECRET` | `different-32+-char-string` | Yes (admin panel) | HMAC secret for refresh tokens — must differ |
| `JWT_ACCESS_TTL_SECONDS` | `900` | No | Access token lifetime (default 15 min) |
| `JWT_REFRESH_TTL_SECONDS` | `2592000` | No | Refresh cookie lifetime (default 30 days) |
| `ADMIN_WEB_ORIGINS` | `https://enkryptify-proxy.vercel.app` | Yes (admin panel) | CORS + cookie origin(s), comma-separated |
| `COOKIE_SECURE` | `true` | Yes (Vercel) | `httpOnly` refresh cookie only over HTTPS |
| `ENABLE_ADMIN_WEB` | `true` or `false` | No | Build and serve the admin dashboard (see below) |
| `NODE_ENV` | `production` | No | Set automatically on Vercel |
| `PORT` | `3000` | No | Local default; ignored on Vercel serverless |

### Admin dashboard toggle (`ENABLE_ADMIN_WEB`)

| Value | Result |
|-------|--------|
| `true` (default in Deploy button) | Proxy **+** admin panel on one domain (`/`, `/login`, `/api/*`, tunnel on `/{workspace}/…`) |
| `false` | **Proxy only** — no SPA build; all routes hit the Bun handler |

When the panel is enabled, update `ADMIN_WEB_ORIGINS` to your real Vercel URL after the first deploy.

The monorepo build (`bun run build:vercel`) uses Turbo to:

1. Always bundle the proxy → `apps/proxy/api/index.js`
2. Optionally build the admin SPA → `apps/proxy/public-admin/` when `ENABLE_ADMIN_WEB` is not `false`

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

Health check: `curl http://localhost:3000/health`

## Manual deploy

```sh
bun install
ek run -- bun run build:vercel
ENABLE_ADMIN_WEB=false ek run -- bun run build:vercel   # proxy only

cd apps/proxy && bunx vercel deploy --prod
```

## Admin panel (`apps/web`)

React/Vite SPA with **Tailwind CSS v4** (`@tailwindcss/vite`). Talks to the proxy via `/api/auth/*` and `/api/admin/*`. The
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
