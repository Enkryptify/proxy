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
