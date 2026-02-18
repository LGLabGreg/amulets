# Amulet — Project Outline

> A version-controlled registry for AI workflow assets: prompts, skills, cursorrules, agent configs, and anything markdown — including full skill packages conforming to the agentskills.io spec.

---

## The Problem

AI-assisted development relies on markdown assets — skills, prompts, `.cursorrules`, `AGENTS.md` files, system instructions — that are currently scattered across repos, Notion pages, and local folders. There's no standard way to version, share, or pull these assets into a project, so developers either recreate them from scratch or copy-paste from old repos.

Skill packages add another layer of complexity: a skill isn't just a single file, it's a folder (`SKILL.md` + optional scripts, references, assets) that needs to be bundled, versioned, and unpacked correctly.

---

## The Solution

A CLI-first registry where developers push markdown assets and skill packages, version them, organise them into collections, and pull them into any project with a single command. Like npm for AI workflow files.

```bash
# Push a single file asset
amulet push ./prompts/refactor.md --name refactor-prompt

# Push a skill package (folder with SKILL.md — auto-detected)
amulet push ./skills/docx/ --name docx-skill --tags claude,claude-code

# Pull a single asset
amulet pull docx-skill --output ./skills/

# Pull a whole collection
amulet pull my-nextjs-stack --output ./
```

---

## Asset Formats

Amulet handles two distinct asset formats:

### Simple Asset

A single markdown file. Used for prompts, `.cursorrules`, `AGENTS.md`, system instructions, and any standalone text.

```
refactor-prompt.md
```

### Skill Package

A folder conforming to the [agentskills.io](https://agentskills.io) open spec. Must contain a `SKILL.md` with YAML frontmatter. Optional subdirectories for scripts, references, and assets.

```
docx-skill/
├── SKILL.md          # Required: YAML frontmatter (name, description) + instructions
├── scripts/          # Optional: executable code the skill calls
├── references/       # Optional: supplementary documentation
└── assets/           # Optional: templates, resources
```

`SKILL.md` frontmatter format:

```yaml
---
name: docx-processing
description: Create and edit Word documents with formatting, tables, and images.
---
```

**Auto-detection on push:** if a folder is passed and contains `SKILL.md`, it is treated as a skill package and stored as a versioned zip bundle. If a single file is passed, it is stored as a simple asset.

**On pull:** skill packages are unpacked into the target output directory, restoring the original folder structure.

---

## Target User

- Solo developers using Claude Code, Cursor, Codex, or other AI coding agents
- Anyone maintaining a `skills/`, `prompts/`, or `.cursorrules` folder across multiple projects
- Teams wanting a shared, versioned source of truth for agent context files

---

## MVP Scope

### Must Have

- [ ] CLI: `push`, `pull`, `list`, `search` commands
- [ ] Both simple assets (single file) and skill packages (folder) supported
- [ ] Auto-detection of asset format on push
- [ ] Asset versioning with full history and diffs (text diff for simple assets, file tree diff for packages)
- [ ] Collections (named groups of assets pinned to specific versions)
- [ ] GitHub OAuth (no email/password)
- [ ] Public assets only (no private in v1)
- [ ] Web UI: browse, search, view asset + version history, file tree for skill packages, copy pull command
- [ ] Asset type tags: `skill`, `prompt`, `cursorrules`, `agentsmd`, `config`

### Explicitly Out of Scope (v1)

- Private assets
- Teams / orgs
- Payments
- Web-based editor
- Comments or ratings
- Webhook integrations
- Asset dependencies

---

## Data Model

```
User
  id, github_id, username, avatar_url, created_at

Asset
  id, owner_id, name, slug, description, asset_format (file|package),
  type (skill|prompt|cursorrules|agentsmd|config), tags[], is_public, created_at

AssetVersion
  id, asset_id, version (semver), message, created_at
  content (text, nullable)          -- populated for simple assets
  storage_path (text, nullable)     -- path to zip in Supabase Storage, for skill packages
  file_manifest (jsonb, nullable)   -- list of files in the package for web UI display

Collection
  id, owner_id, name, slug, description, is_public, created_at

CollectionItem
  id, collection_id, asset_id, pinned_version_id, order
```

Skill packages are stored as zip files in Supabase Storage. The `file_manifest` column stores a JSON array of file paths and sizes so the web UI can render a file tree without unzipping.

---

## CLI Design

Package: `amulet-cli` (or `@amulet-dev/cli` if name is taken on npm)

### Commands

```bash
# Auth
amulet login                          # OAuth via browser
amulet logout
amulet whoami

# Assets
amulet push <file-or-folder> [options]
  --name     asset name/slug
  --message  "version message"
  --tags     comma-separated tags
  --type     skill|prompt|cursorrules|agentsmd|config
  # format auto-detected: folder with SKILL.md = skill package, otherwise simple asset

amulet pull <owner/name>              # pull asset into current dir
  --output   ./path/to/output/        # for packages, unpacks folder here
  --version  1.2.0                    # pin to specific version

amulet list                           # list your assets
amulet search <query>                 # search public registry
amulet diff <owner/name> <v1> <v2>   # diff two versions
amulet versions <owner/name>         # list versions of an asset
amulet inspect <owner/name>          # show file tree for a skill package

# Collections
amulet collection create <name>
amulet collection add <name> <owner/asset>[@version]
amulet collection pull <name> --output ./

# Config (local .amuletrc)
amulet init                           # create .amuletrc in project root
amulet sync                           # pull all assets/collections in .amuletrc
```

### `.amuletrc` (local project config)

```json
{
  "collections": ["lglab/nextjs-supabase-stack"],
  "assets": [
    { "name": "lglab/docx-skill", "output": "./skills/docx/" },
    { "name": "lglab/cursorrules-react", "output": ".cursorrules" }
  ]
}
```

`amulet sync` pulls everything defined in `.amuletrc` at pinned versions. Note that skill packages specify a folder as `output`, while simple assets specify a file path.

---

## Tech Stack

### Backend / API

- **Next.js 15** (App Router) — API routes for everything, keeps it simple
- **Supabase** — Auth (GitHub OAuth), Postgres, Row Level Security
- **Supabase Storage** — stores skill package zips; simple asset content stored as text in DB

### Frontend

- **Next.js 15** — same repo, server components
- **Tailwind CSS** — styling
- **Shadcn/ui** — components
- **Shiki** — markdown/code syntax highlighting in version diffs
- **File tree component** — for rendering skill package structure in the web UI

### CLI

- **TypeScript**
- **Commander.js** — CLI argument parsing
- **archiver / unzipper** — zip/unzip skill packages
- **ora** — spinner for upload/download progress
- **node-fetch** — API calls to backend
- Published to npm as `amulet-cli` or scoped `@amulet-dev/cli` (check availability early)

### Infrastructure

- **Vercel** — hosting (free tier to start)
- **Supabase** — free tier covers MVP comfortably (500MB storage for packages)
- **GitHub OAuth App** — auth provider

### Dev Tooling

- pnpm workspaces: `apps/web`, `packages/cli`
- Biome for linting/formatting
- Vitest for tests

---

## API Routes

```
POST   /api/assets                          push new asset or new version
                                            multipart/form-data: supports both text and zip
GET    /api/assets/:owner/:name             get asset metadata + latest version
GET    /api/assets/:owner/:name/versions    list all versions
GET    /api/assets/:owner/:name/:version    get version (text or signed download URL for zip)
GET    /api/assets/search?q=&tags=&format=
POST   /api/collections
GET    /api/collections/:owner/:name
POST   /api/collections/:owner/:name/items
DELETE /api/collections/:owner/:name/items/:id
GET    /api/me/assets
GET    /api/me/collections
```

For skill package pulls, the API returns a signed Supabase Storage URL. The CLI downloads and unzips directly — no proxying large files through the Next.js server.

---

## Web UI Pages

| Route                       | Description                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `/`                         | Landing page + search                                                                                                     |
| `/explore`                  | Browse public assets, filter by type/tag/format                                                                           |
| `/:owner`                   | User profile, their public assets and collections                                                                         |
| `/:owner/:name`             | Asset detail: for simple assets shows rendered markdown + diffs; for skill packages shows `SKILL.md` rendered + file tree |
| `/:owner/:name/:version`    | Specific version with diff vs previous                                                                                    |
| `/collections/:owner/:name` | Collection detail + CLI pull command                                                                                      |
| `/dashboard`                | Your assets and collections (authed)                                                                                      |
| `/new`                      | Push asset via web form (authed) — supports file upload or folder zip upload                                              |

---

## Roadmap

### Phase 1 — Core Loop (Week 1–2)

- Supabase project setup, schema, GitHub OAuth, Storage bucket
- API routes: push (both formats), pull, list, versions
- CLI: login, push (with auto-detection), pull (with unpack), list
- Minimal web UI: explore + asset detail page with file tree for packages
- Deploy to Vercel

**Goal:** Push your own Claude Code skill packages and pull them into another project.

### Phase 2 — Usability (Week 3–4)

- Collections: create, add assets, pull whole collection
- `.amuletrc` + `amulet sync`
- Version diffs in web UI (text diff for simple assets, file tree diff for packages)
- Search by tag, type, and format
- User profile pages
- `amulet inspect` command for browsing package contents before pulling

**Goal:** 10 people using CLI to pull an asset into a real project.

### Phase 3 — Growth (Month 2)

- Seed the registry with high-quality public skill packages (docx, pdf, pptx, xlsx, frontend-design) and `.cursorrules` for common stacks
- Write a blog post / post on X showing the workflow
- Accept community submissions / featured assets
- Asset ratings (thumbs up only, keep it simple)
- Web editor for simple assets (edit and push a new version without CLI)

### Phase 4 — Monetisation (Month 3)

- Private assets (both formats) — **$12/mo Personal**
- Private collections — included in Personal
- Teams (shared private assets, org namespace) — **$40/mo Team**
- Stripe Billing via Supabase + Stripe integration
- Usage limits on free tier (e.g. 10 public assets, 100MB package storage)

### Phase 5 — Ecosystem (Month 4+)

- VS Code extension — browse and pull assets from within editor
- Claude Code MCP server — pull amulet assets directly from agent context
- Asset dependencies (a skill package can declare dependencies on other packages)
- Verified publisher badges
- GitHub Action: `amulet sync` on PR to keep team assets up to date
- agentskills.io spec compliance badge shown on qualifying skill packages

---

## Pricing (when ready)

| Tier       | Price  | Limits                                                   |
| ---------- | ------ | -------------------------------------------------------- |
| Free       | $0     | 10 public assets, unlimited pulls, 100MB package storage |
| Personal   | $12/mo | Unlimited private assets + collections, 1GB storage      |
| Team       | $40/mo | Org namespace, team sharing, 5 seats, 5GB storage        |
| Enterprise | Custom | SSO, audit logs, SLA                                     |

---

## Risks & Mitigations

| Risk                                   | Mitigation                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| Name conflict on npm / domain          | Check early, have alternates ready (Grimoire, Graft, Quill)                              |
| Low initial content = low value        | Seed with your own high-quality skill packages before launch                             |
| GitHub already does this (Gist)        | Gists can't handle folder packages, versioning, or the CLI pull workflow                 |
| OpenAI / Anthropic build this natively | Focus on multi-tool, multi-model positioning early; agentskills.io spec is tool-agnostic |
| Zip storage costs at scale             | Simple assets are text, packages are typically <1MB; Supabase Storage is cheap           |

---

## First Actions

1. Register `amulets.dev` (primary) and `amulet.sh` (CLI alias/redirect) — both confirmed available
2. Check npm for `amulet-cli` name availability
3. Spin up Supabase project + create schema + Storage bucket
4. Scaffold pnpm monorepo: `apps/web` + `packages/cli`
5. Build push/pull CLI loop locally — test with a real skill package from `/mnt/skills/public/docx/`
6. Deploy to Vercel and publish your first real skill package to the registry
