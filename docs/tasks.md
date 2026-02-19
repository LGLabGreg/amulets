# Amulet — Master Task List

Tasks are worked through in order within each phase. Check off items as completed.

---

## Phase 0 — Repository Setup

- [x] Create `CLAUDE.md` with project conventions
- [x] Create `docs/tasks.md` (this file)
- [x] **T01** Scaffold pnpm monorepo (`pnpm-workspace.yaml`, root `package.json`, `apps/web`, `packages/cli` stubs)
- [x] **T02** Configure Biome (root `biome.json`, add to root `package.json` scripts)
- [x] **T03** Configure Vitest (root `vitest.config.ts`, test script)
- [x] **T04** Set up TypeScript configs (`tsconfig.base.json` + per-package extends)
- [x] **T05** Add `.gitignore`, `.env.example`, basic `README.md`

---

## Phase 1 — Infrastructure (manual setup, you do these)

- [x] **T06** Create Supabase project → copy `SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY` into `apps/web/.env.local`
- [x] **T07** Create GitHub OAuth App (Settings → Developer Settings → OAuth Apps) → copy `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` into Supabase Auth dashboard
- [x] **T08** Create Supabase Storage bucket named `packages` (public bucket, for skill package zips)

---

## Phase 2 — Database Schema

- [x] **T09** Migration: `users` table + RLS (insert/select own row)
- [x] **T10** Migration: `assets` table + RLS (public read, owner write)
- [x] **T11** Migration: `asset_versions` table + RLS
- [x] **T12** Migration: `collections` + `collection_items` tables + RLS
- [x] **T13** Migration: DB indexes (owner slug lookups, search on name/description)
- [x] **T14** Apply migrations to Supabase project (via Supabase CLI or dashboard)

---

## Phase 3 — Web App Foundation

- [x] **T15** Scaffold `apps/web` as Next.js 15 app (App Router, TypeScript, Tailwind)
- [x] **T16** Install and configure Shadcn/ui (base components: Button, Input, Badge, Card, Dialog) — added via `shadcn add`
- [x] **T17** Set up Supabase client helpers (`utils/supabase/server.ts`, `utils/supabase/client.ts`, `utils/supabase/middleware.ts`)
- [x] **T18** Auth middleware: protect `/dashboard` and `/new` routes, handle session refresh
- [x] **T19** Base layout: header (logo, search bar, login/logout, avatar), footer

---

## Phase 4 — API Routes

- [x] **T20** `POST /api/assets` — push simple asset (text content, create asset + version)
- [x] **T21** `POST /api/assets` — push skill package (multipart zip upload → Supabase Storage, store `file_manifest`)
- [x] **T22** `GET /api/assets/search` — full-text search on name + description, filter by type/tags/format
- [x] **T23** `GET /api/assets/:owner/:name` — asset metadata + latest version info
- [x] **T24** `GET /api/assets/:owner/:name/versions` — list all versions
- [x] **T25** `GET /api/assets/:owner/:name/:version` — return text content (simple) or signed storage URL (package)
- [x] **T26** `GET /api/me/assets` — list authenticated user's assets
- [x] **T27** `GET /api/me/collections` — list authenticated user's collections

---

## Phase 5 — CLI

- [ ] **T28** Scaffold `packages/cli`: `package.json`, `tsconfig.json`, Commander.js entry point, build script
- [ ] **T29** `amulet login` — open browser to Supabase GitHub OAuth URL, listen on localhost callback, save token to `~/.config/amulet/config.json`
- [ ] **T30** `amulet logout` / `amulet whoami`
- [ ] **T31** `amulet push <file>` — push simple asset (read file, POST to API)
- [ ] **T32** `amulet push <folder>` — push skill package (detect `SKILL.md`, zip folder, multipart POST)
- [ ] **T33** `amulet pull <owner/name>` (simple asset) — fetch text content, write to file
- [ ] **T34** `amulet pull <owner/name>` (skill package) — fetch signed URL, download zip, unzip to `--output` dir
- [ ] **T35** `amulet list` — list your assets (calls `GET /api/me/assets`)
- [ ] **T36** `amulet search <query>` — search public registry
- [ ] **T37** `amulet versions <owner/name>` — list versions of an asset
- [ ] **T38** npm publish setup (`prepublishOnly` build, `bin` field, `files` array)

---

## Phase 6 — Web UI (MVP pages)

- [ ] **T39** `/` Landing page: hero text, search bar, featured/recent assets
- [ ] **T40** `/explore` page: browse public assets, filter by type/tag/format, paginated
- [ ] **T41** `/:owner/:name` asset detail page — simple asset: render `SKILL.md` / markdown content with Shiki
- [ ] **T42** `/:owner/:name` asset detail page — skill package: render `SKILL.md` + file tree from `file_manifest`
- [ ] **T43** `/:owner/:name/:version` — version detail with diff vs previous (simple asset: text diff; package: file tree diff)
- [ ] **T44** `/dashboard` — list your assets + collections (authed)
- [ ] **T45** `/new` — push asset via web form (text input for simple assets, zip upload for packages)

---

## Phase 7 — Deploy & End-to-End Test

- [ ] **T46** Deploy `apps/web` to Vercel (connect repo, add env vars)
- [ ] **T47** Publish `amulet-cli` to npm (check name availability first)
- [ ] **T48** End-to-end smoke test: `amulet login` → `amulet push` a real skill package → `amulet pull` it into a fresh directory → verify file structure

---

## Phase 8 — Collections

- [ ] **T49** `POST /api/collections` — create collection
- [ ] **T50** `GET /api/collections/:owner/:name` — collection detail + items
- [ ] **T51** `POST /api/collections/:owner/:name/items` — add asset to collection
- [ ] **T52** `DELETE /api/collections/:owner/:name/items/:id` — remove item
- [ ] **T53** CLI: `amulet collection create <name>`
- [ ] **T54** CLI: `amulet collection add <name> <owner/asset>[@version]`
- [ ] **T55** CLI: `amulet collection pull <name> --output ./`
- [ ] **T56** CLI: `amulet init` (create `.amuletrc`) + `amulet sync` (pull all assets in `.amuletrc`)
- [ ] **T57** Web UI: `/collections/:owner/:name` collection detail page

---

## Phase 9 — Polish & Growth Features

- [ ] **T58** CLI: `amulet inspect <owner/name>` — print file tree of a package without pulling
- [ ] **T59** CLI: `amulet diff <owner/name> <v1> <v2>` — diff two versions
- [ ] **T60** Web UI: `/:owner` user profile page (their public assets + collections)
- [ ] **T61** Web UI: version diff view (unified diff for text, file tree diff for packages)
- [ ] **T62** Search improvements: tag filter chips, format filter, type filter in `/explore`
- [ ] **T63** Seed registry with high-quality skill packages (docx, pdf, pptx, xlsx)

---

## Backlog (Phase 4+)

- Private assets (auth-gated)
- Asset ratings (thumbs up)
- Web editor for simple assets
- VS Code extension
- Claude Code MCP server for pulling amulet assets from agent context
- Asset dependencies
- GitHub Action: `amulet sync` on PR
