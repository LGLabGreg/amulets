# Amulets — Claude Code Instructions

## Project Overview

A CLI-first registry for AI workflow assets (prompts, skills, `.cursorrules`, `AGENTS.md`).
"Your AI workflows, everywhere." Domain: `amulets.dev`

## Monorepo Structure

```
apps/
  web/          # Next.js 15 App Router — web UI + API routes
packages/
  cli/          # TypeScript CLI, published to npm as amulets-cli
docs/
  project-outline.md   # Full spec, data model, roadmap
  tasks.md             # Master task list
```

## Package Manager

**Always use `pnpm`.** Never use npm or yarn.

```bash
pnpm install              # install all workspaces
pnpm --filter web dev     # run web dev server
pnpm --filter cli build   # build CLI
pnpm test                 # run all tests (Vitest)
pnpm lint                 # Biome lint
pnpm format               # Biome format
```

**Always install packages with `@latest`** — never hardcode a version number from memory. Training data versions are stale.

```bash
pnpm --filter web add some-package@latest
pnpm --filter amulets-cli add some-package@latest
```

## Code Style

- **Biome** for linting and formatting (not ESLint/Prettier)
- **TypeScript strict mode** everywhere
- No `any` unless absolutely unavoidable
- Prefer `const` over `let`
- Named exports over default exports (except Next.js page components which require default)

## Tech Stack

### Web (`apps/web`)

- Next.js 16 App Router (server components by default)
- Supabase JS client (`@supabase/ssr` for server/client split)
- Tailwind CSS + Shadcn/ui
- Shiki for code highlighting

### CLI (`packages/cli`)

- Commander.js for argument parsing
- `archiver` for zipping skill packages, `unzipper` for unpacking
- `ora` for spinners
- Credentials stored in `~/.config/amulets/config.json`

### Database

- Supabase Postgres with Row Level Security
- Migrations in `apps/web/supabase/migrations/`
- **Use the Supabase MCP server** to apply migrations and query the database directly — it is configured in `~/.claude.json` and available in Claude Code sessions
- **Never manually edit `apps/web/lib/database.types.ts`** — it is auto-generated from the live schema. If types and code conflict, the code is wrong; fix the code or write a migration

## Environment Variables

See `apps/web/.env.example`. Required:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

CLI reads from `~/.config/amulets/config.json` (written by `amulets login`).

## Key Architectural Decisions

- **Simple assets** (single `.md` file): content stored as text in `AssetVersion.content`
- **Skill packages** (folder with `SKILL.md`): zipped and stored in Supabase Storage; `file_manifest` JSONB column holds file tree for UI rendering without unzipping
- **API large file handling**: for skill package pulls, API returns a signed Supabase Storage URL — CLI downloads directly from storage, not proxied through Next.js
- **Auth**: GitHub OAuth via Supabase Auth. CLI uses a browser-based OAuth flow, stores access token locally.

## Three Asset Formats

1. **file** — single markdown file (prompts, AGENTS.md, CLAUDE.md, .cursorrules, etc.)
2. **skill** — directory containing `SKILL.md` (agentskills.io compliant)
3. **bundle** — any other directory (cursor rules sets, windsurf rules, etc.)

Auto-detection on `amulets push`:

- Single file → `file`
- Directory with `SKILL.md` → `skill`
- Directory without `SKILL.md` → `bundle`

All directory formats (skill + bundle) are stored as zipped archives in Supabase Storage.
The `type` column has been removed. Use `tags` for categorisation instead.

## Data Model (key tables)

```
User:          id, github_id, username, avatar_url, created_at
Asset:         id, owner_id, name, slug, description, asset_format (file|skill|bundle), tags[], is_public
AssetVersion:  id, asset_id, version (semver), message, content (nullable), storage_path (nullable), file_manifest (jsonb), created_at
Collection:    id, owner_id, name, slug, description, is_public
CollectionItem: id, collection_id, asset_id, pinned_version_id, order
```

## API Route Pattern

All API routes live in `apps/web/app/api/`. Use Supabase service role client for mutations, anon client for public reads.

## Shadcn/UI Rules

- **Always read the component file before using it** — check actual props, not assumed Radix API
- **base-lyra style uses Base UI primitives (not Radix)** — `asChild` does NOT exist on any component
- **Never use raw HTML** (`<button>`, `<img>`, `<input>`) when a shadcn component exists (`Button`, `Avatar`, `Input`, etc.) — this applies everywhere including inside `render` props and client components
- **Never add custom Tailwind classes** to shadcn components unless the user explicitly requests styling changes — use default component styles
- **Composition pattern for navigation items**: put `<Link>` as children inside `<DropdownMenuItem>`, not via `asChild`
- **`DropdownMenuLabel` must always be wrapped in `DropdownMenuGroup`** — Base UI requires `MenuPrimitive.GroupLabel` to have a `Menu.Group` parent or it throws at runtime
- **Before adding a new shadcn component**, check `apps/web/components/ui/` first — it may already exist

## Task Plan

See `docs/tasks.md` for the full task list. Work through tasks in order.

## Testing

- Unit tests: `packages/cli/src/__tests__/`
- Integration tests (API): `apps/web/__tests__/`
- Run with: `pnpm test`
