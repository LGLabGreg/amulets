# Amulet — Project Outline

> A private skill management platform for AI workflow assets: prompts, skills, `.cursorrules`, `AGENTS.md`, and skill packages conforming to the agentskills.io spec.

---

## The Problem

AI-assisted development relies on markdown assets — skills, prompts, `.cursorrules`, `AGENTS.md` files, system instructions — that are currently scattered across repos, Notion pages, and local folders. There's no standard way to version, organise, and pull these assets into a project, so developers either recreate them from scratch or copy-paste from old repos.

Public discovery is already handled by the open ecosystem (`npx skills add`, GitHub repos, shadcn-style CLIs). What's missing is the **private layer**: how do developers store, version, and sync their own customised assets across projects and machines?

---

## The Solution

A CLI-first tool where developers push their private markdown assets and skill packages, version them, and pull them into any project with a single command.

```bash
# Push a skill
amulets push AGENTS.md -n agents

# Push a whole skill package
amulets push ./skills/docx/ -n docx-skill

# Pull into any project
amulets pull agents
amulets pull docx-skill --output ./skills/
```

**Positioning:** "npx skills is how you discover public skills. Amulet is how you manage your private ones."

---

## Asset Formats

Amulet handles three distinct asset formats:

### file

A single markdown file. Used for prompts, `.cursorrules`, `AGENTS.md`, `CLAUDE.md`, system instructions, and any standalone text.

```
my-prompt.md
```

### skill

A folder conforming to the [agentskills.io](https://agentskills.io) open spec. Must contain a `SKILL.md` with YAML frontmatter. Optional subdirectories for scripts, references, and assets.

```
docx-skill/
├── SKILL.md          # Required: YAML frontmatter + instructions
├── scripts/          # Optional: executable code the skill calls
├── references/       # Optional: supplementary documentation
└── assets/           # Optional: templates, resources
```

### bundle

Any other directory without a `SKILL.md`. Used for cursor rules sets, windsurf rules, multi-file prompt collections, etc.

**Auto-detection on push:**

- Single file → `file`
- Directory with `SKILL.md` → `skill`
- Directory without `SKILL.md` → `bundle`

**On pull:** skill and bundle archives are unpacked into the target output directory, restoring the original folder structure.

---

## Target User

- Solo developers using Claude Code, Cursor, Codex, or other AI coding agents
- Anyone maintaining a `skills/`, `prompts/`, or `.cursorrules` folder across multiple projects
- Teams wanting a shared, versioned source of truth for private agent context files

---

## MVP Scope

### Must Have

- [x] CLI: `push`, `pull`, `list`, `versions` commands
- [x] Both simple assets (single file) and skill/bundle packages (folder) supported
- [x] Auto-detection of asset format on push
- [x] Asset versioning with full history
- [x] GitHub OAuth (no email/password)
- [x] All assets private by default — only the owner can access them
- [x] Web UI: dashboard (your assets), asset detail (version history, content, pull command), push via form
- [ ] Collections (named groups of assets pinned to specific versions)
- [ ] `.amuletrc` + `amulets sync` (pull all pinned assets into a project in one command)

### Out of Scope (v1)

- Public asset registry or browsing
- Teams / orgs (Phase 2)
- Payments (Phase 2)
- Web-based editor
- Comments or ratings
- Asset dependencies

---

## Data Model

```
User
  id, github_id, username, avatar_url, created_at

Asset
  id, owner_id, name, slug, description
  asset_format (file|skill|bundle)
  tags[]
  created_at, updated_at

AssetVersion
  id, asset_id, version (semver), message, created_at
  content (text, nullable)          -- populated for file assets
  storage_path (text, nullable)     -- path to zip in Supabase Storage, for skill/bundle
  file_manifest (jsonb, nullable)   -- list of files in the package for web UI display

Collection
  id, owner_id, name, slug, description, created_at

CollectionItem
  id, collection_id, asset_id, pinned_version_id, order
```

**RLS:** All tables use owner-only RLS (`auth.uid() = owner_id`). There is no public read access. Future team support will extend policies to include team membership.

Skill and bundle packages are stored as zip files in Supabase Storage. The `file_manifest` column stores a JSON array of file paths and sizes so the web UI can render a file tree without unzipping.

---

## CLI Design

Package: `amulets-cli` on npm

### Commands

```bash
# Auth
amulets login                           # OAuth via browser
amulets logout
amulets whoami

# Assets
amulets push <file-or-folder> [options]
  -n, --name <name>          asset name (prompted if omitted)
  -v, --version <ver>        semver version [default: 1.0.0]
  -m, --message <msg>        version message
  -t, --tags <tags>          comma-separated tags
  -d, --description <desc>   short description

amulets pull <name>                     # pull your asset (name or owner/name)
  -o, --output <path>        output file or directory
  -v, --version <ver>        pin to version [default: latest]

amulets list                            # list your assets
amulets versions <owner/name>           # list versions of an asset

# Future
amulets inspect <owner/name>            # show file tree for a skill/bundle
amulets diff <owner/name> <v1> <v2>    # diff two versions

# Collections (Phase 2)
amulets collection create <name>
amulets collection add <name> <owner/asset>[@version]
amulets collection pull <name> --output ./

# Config (Phase 2)
amulets init                            # create .amuletrc in project root
amulets sync                            # pull all assets defined in .amuletrc
```

### `.amuletrc` (Phase 2)

```json
{
  "assets": [
    { "name": "myuser/docx-skill", "output": "./skills/docx/" },
    { "name": "myuser/agents", "output": "./.claude/agents.md" }
  ]
}
```

`amulets sync` pulls everything defined in `.amuletrc` at pinned versions.

---

## Tech Stack

### Backend / API

- **Next.js 16** (App Router) — API routes for everything
- **Supabase** — Auth (GitHub OAuth), Postgres, Row Level Security
- **Supabase Storage** — stores skill/bundle package zips; file asset content stored as text in DB

### Frontend

- **Next.js 16** — same repo, server components by default
- **Tailwind CSS** — styling
- **Shadcn/ui** (base-lyra style, Base UI primitives)
- **Shiki** — markdown/code syntax highlighting

### CLI

- **TypeScript** + **Commander.js**
- **archiver / unzipper** — zip/unzip skill packages
- **ora** — spinner for upload/download progress
- Published to npm as `amulets-cli`

### Infrastructure

- **Vercel** — hosting
- **Supabase** — free tier covers MVP
- **GitHub OAuth App** — auth provider

### Dev Tooling

- pnpm workspaces: `apps/web`, `packages/cli`
- Biome for linting/formatting
- Vitest for tests

---

## API Routes

All routes require authentication. No anonymous access.

```
POST   /api/assets                          push asset (file or skill/bundle)
GET    /api/assets/:owner/:name             asset metadata + versions (auth + ownership)
GET    /api/assets/:owner/:name/versions    list versions (auth + ownership)
GET    /api/assets/:owner/:name/:version    version content or signed download URL (auth + ownership)
DELETE /api/assets/:owner/:name             delete asset (auth + ownership)

POST   /api/collections                     create collection
GET    /api/collections/:owner/:name        collection detail + items
POST   /api/collections/:owner/:name/items  add asset to collection
DELETE /api/collections/:owner/:name/items/:id

GET    /api/me/assets                       list authenticated user's assets
GET    /api/me/collections                  list authenticated user's collections
POST   /api/auth/me                         get current user from token
POST   /api/auth/refresh                    refresh token
```

For skill/bundle pulls, the API returns a signed Supabase Storage URL. The CLI downloads and unzips directly — no proxying large files through the Next.js server.

---

## Web App Routes

| Route | Auth | Description |
|-------|------|-------------|
| `/` | No | Landing/marketing page with login CTA |
| `/dashboard` | Yes | Your skills library — all assets, stats, links to detail |
| `/dashboard/:slug` | Yes | Asset detail: version history, content render, pull command |
| `/new` | Yes | Push a file asset via web form |
| `/cli-auth` | No | CLI OAuth callback |

---

## Roadmap

### Phase 1 — Core Loop (complete)

- Supabase project setup, schema, GitHub OAuth, Storage bucket
- API routes: push (file + skill/bundle), pull, list, versions
- CLI: login, push (auto-detection), pull (with unpack), list, versions
- Web UI: dashboard + asset detail + /new form
- Private-only architecture (owner-only RLS, no public registry)

**Goal:** Push your own assets and pull them into another project.

### Phase 2 — Sync (next)

- Collections: create, add assets, pull whole collection
- `.amuletrc` + `amulets sync`
- Version diff view in web UI
- `amulets inspect` command for browsing package contents before pulling
- Deploy to Vercel + publish CLI to npm

**Goal:** Define a project's asset dependencies in `.amuletrc`, run `amulets sync`, done.

### Phase 3 — Teams

The private-only model makes teams the natural paid upgrade:

- Team namespace (e.g. `@myteam/skill-name`)
- Shared private assets visible to all team members
- Role-based access (admin, member)
- Team dashboard

| Tier | Price | Includes |
|------|-------|----------|
| Free | $0 | 10 skills, 100MB storage, single user |
| Pro | $9/mo | Unlimited skills, 1GB storage, `.amuletrc` sync |
| Team | $29/mo | Shared namespace, 5 seats, 5GB, role-based access |

### Phase 4 — Ecosystem

- VS Code extension — browse and pull assets from within editor
- Claude Code MCP server — pull amulet assets directly from agent context
- Asset dependencies (a skill package can declare dependencies on other packages)
- GitHub Action: `amulets sync` on PR to keep team assets up to date

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| "Just use a private GitHub repo" | Amulets adds versioning, a pull CLI, and future team sharing without needing a full repo per asset |
| OpenAI / Anthropic build this natively | Focus on multi-tool, multi-model positioning; agentskills.io spec is tool-agnostic |
| Zip storage costs at scale | Simple assets are text; packages are typically <1MB; Supabase Storage is cheap |
