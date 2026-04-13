# proxy-monorepo

A Turborepo monorepo with a **Hono + Bun** API backend and a **React + Vite** frontend.

## Tech Stack

| Layer       | Technology                   |
| ----------- | ---------------------------- |
| Runtime     | Bun                          |
| Backend     | Hono                         |
| Frontend    | React + Vite                 |
| Database    | Drizzle ORM + PostgreSQL     |
| Validation  | Zod                          |
| Linting     | OXLint                       |
| Formatting  | Prettier                     |
| Monorepo    | Turborepo                    |
| Language    | TypeScript                   |

## Getting Started

```bash
# Install dependencies
bun install

# Start all apps in dev mode
bun run dev

# Build everything
bun run build

# Lint
bun run lint

# Format
bun run format
```

## Project Structure

```
apps/
  proxy/   – Hono API (Bun runtime)
  web/     – React SPA (Vite)
packages/
  types/   – Shared TypeScript types
  docs/    – Documentation
```

## Database

```bash
# Generate migrations after schema changes
bun run db:generate

# Apply migrations
bun run db:migrate
```
