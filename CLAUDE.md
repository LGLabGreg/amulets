# Amulets — Claude Code Instructions

## Project Overview

A CLI-first registry for AI workflow assets (prompts, skills, `.cursorrules`, `AGENTS.md`).
"npm for AI workflow files." Domain: `amulets.dev`

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

## Two Asset Formats

1. **Simple asset** — single markdown file (prompts, cursorrules, AGENTS.md, etc.)
2. **Skill package** — folder conforming to agentskills.io spec. Must contain `SKILL.md` with YAML frontmatter:
   ```yaml
   ---
   name: docx-processing
   description: Create and edit Word documents.
   ---
   ```

Auto-detection on `amulets push`: if a folder is passed and contains `SKILL.md` → skill package. Otherwise → simple asset.

## Data Model (key tables)

```
User:          id, github_id, username, avatar_url, created_at
Asset:         id, owner_id, name, slug, description, asset_format (file|package), type, tags[], is_public
AssetVersion:  id, asset_id, version (semver), message, content (nullable), storage_path (nullable), file_manifest (jsonb), created_at
Collection:    id, owner_id, name, slug, description, is_public
CollectionItem: id, collection_id, asset_id, pinned_version_id, order
```

## API Route Pattern

All API routes live in `apps/web/app/api/`. Use Supabase service role client for mutations, anon client for public reads.

## Task Plan

See `docs/tasks.md` for the full task list. Work through tasks in order.

## Testing

- Unit tests: `packages/cli/src/__tests__/`
- Integration tests (API): `apps/web/__tests__/`
- Run with: `pnpm test`
