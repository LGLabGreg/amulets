# Amulets Web

Next.js 16 App Router application — web dashboard and API for [Amulets](https://amulets.dev), a private AI skill management platform.

## What this app is

- **Dashboard** (`/dashboard`) — browse, view, and manage your private assets
- **API** (`/api/assets`, `/api/me/*`) — push/pull endpoints consumed by the `amulets` CLI
- **Auth** (`/cli-auth`) — GitHub OAuth callback for CLI authentication

## Running locally

```bash
# From the repo root
pnpm install

# Copy and fill in env vars
cp apps/web/.env.example apps/web/.env.local

# Start the dev server
pnpm --filter web dev
```

Required env vars (see `apps/web/.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Conventions

See [`CLAUDE.md`](../../CLAUDE.md) at the repo root for full project conventions, architecture decisions, and the tech stack.
