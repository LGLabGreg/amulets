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

## Phase 1 — Infrastructure

- [x] **T06** Create Supabase project → copy `SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY` into `apps/web/.env.local`
- [x] **T07** Create GitHub OAuth App → copy `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` into Supabase Auth dashboard
- [x] **T08** Create Supabase Storage bucket named `packages` (public bucket, for skill package zips)

---

## Phase 2 — Database Schema

- [x] **T09** Migration: `users` table + RLS (insert/select own row)
- [x] **T10** Migration: `assets` table + RLS (public read, owner write)
- [x] **T11** Migration: `asset_versions` table + RLS
- [x] **T12** Migration: `collections` + `collection_items` tables + RLS
- [x] **T13** Migration: DB indexes (owner slug lookups, search on name/description)
- [x] **T14** Apply migrations to Supabase project

---

## Phase 3 — Web App Foundation

- [x] **T15** Scaffold `apps/web` as Next.js 15 app (App Router, TypeScript, Tailwind)
- [x] **T16** Install and configure Shadcn/ui (base components: Button, Input, Badge, Card, Dialog)
- [x] **T17** Set up Supabase client helpers (`utils/supabase/server.ts`, `utils/supabase/client.ts`, `utils/supabase/middleware.ts`)
- [x] **T18** Auth middleware: protect `/dashboard` and `/new` routes, handle session refresh
- [x] **T19** Base layout: header (logo, search bar, login/logout, avatar), footer

---

## Phase 4 — API Routes

- [x] **T20** `POST /api/assets` — push simple asset (text content, create asset + version)
- [x] **T21** `POST /api/assets` — push skill package (multipart zip upload → Supabase Storage, store `file_manifest`)
- [x] **T22** `GET /api/assets/search` — full-text search on name + description, filter by tags/format
- [x] **T23** `GET /api/assets/:owner/:name` — asset metadata + latest version info
- [x] **T24** `GET /api/assets/:owner/:name/versions` — list all versions
- [x] **T25** `GET /api/assets/:owner/:name/:version` — return text content (simple) or signed storage URL (package)
- [x] **T26** `GET /api/me/assets` — list authenticated user's assets
- [x] **T27** `GET /api/me/collections` — list authenticated user's collections

---

## Phase 5 — CLI

- [x] **T28** Scaffold `packages/cli`: `package.json`, `tsconfig.json`, Commander.js entry point, build script
- [x] **T29** `amulets login` — browser redirect to `amulets.dev/cli-auth`, listen on localhost callback, save token
- [x] **T30** `amulets logout` / `amulets whoami`
- [x] **T31** `amulets push <file>` — push simple asset (read file, POST to API)
- [x] **T32** `amulets push <folder>` — detect format (`skill` if `SKILL.md` present, else `bundle`), zip, multipart POST
- [x] **T33** `amulets pull <owner/name>` (simple asset) — fetch text content, write to file
- [x] **T34** `amulets pull <owner/name>` (skill/bundle) — fetch signed URL, download zip, unzip to `--output` dir
- [x] **T35** `amulets list` — list your assets (calls `GET /api/me/assets`)
- [x] **T36** `amulets versions <owner/name>` — list versions of an asset
- [x] **T37** npm publish setup (`prepublishOnly` build, `bin` field, `files` array)

---

## Phase 6 — Web UI (MVP pages)

- [x] **T38** `/` Landing page: hero text, featured/recent assets, CLI command examples
- [x] **T39** `/explore` page: browse public assets, filter by tag/format, paginated
- [x] **T40** `/:owner/:name` asset detail page — file: render markdown content with Shiki
- [x] **T41** `/:owner/:name` asset detail page — skill/bundle: render `SKILL.md` + file tree from `file_manifest`
- [x] **T42** `/:owner/:name/:version` — version detail with diff vs previous
- [x] **T43** `/dashboard` — list your assets + collections (authed)
- [x] **T44** `/new` — push asset via web form (text input for simple assets)

---

## Phase 7 — Pre-Deploy Hardening

### 7A — Critical Bug Fixes

- [x] **A1** Fix ESM `require()` in CLI pull.ts — replace with top-level `import { Readable } from 'node:stream'`
- [x] **A2** Add `fts` generated column migration — stored tsvector column with GIN index, drop redundant computed index
- [x] **A3** CLI token refresh — store `refresh_token` + `expires_at` on login; `getValidToken()` refreshes before API calls
- [x] **A4** Reserve `"latest"` as a version string — validate in push endpoint and return 400
- [x] **A5** Add file size guard on package uploads — reject zips > 4MB with 413 before reading into memory

### 7B — Asset Format Refactor (`file | skill | bundle`)

- [x] **R1** Migration: rename `package`→`skill`, add `bundle` to check constraint, drop `type` column
- [x] **R2** Update TypeScript types: `asset_format: 'file' | 'skill' | 'bundle'`, remove `type` field everywhere
- [x] **R3** CLI `push.ts`: replace `isSkillPackage` with `detectFormat()`, remove `--type` flag, send `asset_format` in payload
- [x] **R4** API push route: accept `asset_format` from CLI, remove `VALID_TYPES` enum and `type` field from upsert
- [x] **R5** Web UI: update AssetCard, ExploreFilters, Explore page, asset detail pages, dashboard, homepage, `/new` form — remove all `type` references, fix format checks

### 7C — Public/Private Architecture

- [x] **B1** Migration: set `is_public` default to `false`
- [x] **B2** Migration: add `is_reported boolean DEFAULT false` to assets; create `asset_reports` table + RLS policies
- [x] **B3** Migration: update `assets_select` RLS policy to exclude reported assets
- [x] **B4** `POST /api/assets` — accept and persist `is_public` from request body (default `false`)
- [x] **B5** `GET /api/assets/:owner/:name/:version` — return metadata-only for public assets without `x-amulets-approve: true` header; owners always get full content
- [x] **B6** `POST /api/assets/:owner/:name/report` — new report endpoint; inserts into `asset_reports`, sets `is_reported = true`
- [x] **B7** `GET /api/assets/search` — add `is_reported: false` filter
- [x] **B8** Remove CLI `search` command — discovery happens on the website
- [x] **B9** CLI `pull` — add `--approve` flag; send `x-amulets-approve: true` header; if server returns `review_url` without content, print guidance and exit 1
- [x] **B10** CLI `push` — add `--public` flag; include `is_public` in push payload; show `public`/`private` in success message
- [x] **B11** CLI `api.ts` — update `getAssetVersion` to accept token + extra headers; add `is_public` to push payloads; remove `searchAssets` export
- [x] **B12** Require auth on all CLI commands — `pull`, `list`, `versions` all call `requireToken()`
- [x] **B13** `/:owner/:name` — update pull command block to show `--approve` for public assets; add "Copy content" button for simple assets
- [x] **B14** `/:owner/:name` — add `<ReportButton>` client component (visible to logged-in non-owners on public assets)
- [x] **B15** `/new` — add "Make this asset public" checkbox; pass `is_public` through `createAssetAction`
- [x] **B16** Landing page — update hero copy and "how it works" examples to reflect private-first + `--approve` pattern
- [x] **B17** Explore page — rename header to "Public Assets", add `--approve` note, add `is_reported: false` filter
- [x] **B18** Dashboard — add public/private badge to each asset row
- [x] **B19** Web-app CLI auth — replace direct Supabase PKCE flow with browser redirect to `amulets.dev/cli-auth`; add `/api/auth/me` and `/api/auth/refresh` routes; CLI needs no Supabase env vars

### 7D — Private-Only Refactor

See `docs/refactor-private-only.md` for full context and rationale.

- [x] **P1** Migration: drop `asset_reports` table; drop `is_public` + `is_reported` from `assets`; drop `is_public` from `collections`; drop `fts` column + trigger from `assets`; add `updated_at timestamptz` to `assets`; replace all RLS policies with owner-only (`auth.uid() = owner_id`); regenerate `apps/web/lib/database.types.ts`
- [x] **P2** API cleanup: delete `GET /api/assets/search` route; delete `POST /api/assets/:owner/:name/report` route; add auth + ownership check to `GET /api/assets/:owner/:name`, `GET .../versions`, `GET .../:version`; remove `is_public`, `is_reported`, `x-amulets-approve`, `review_url` logic from all routes
- [x] **P3** CLI cleanup: remove `--public` flag from `push.ts`; remove `--approve` flag from `pull.ts`; remove `x-amulets-approve` header and `is_public` from `api.ts` push payloads; update program description in `index.ts` to `"Manage your private AI skills — push, pull, and sync"`
- [x] **P4** Web overhaul: delete `app/explore/` directory; delete `app/[owner]/page.tsx` (public profile); delete `app/[owner]/[name]/[version]/page.tsx`; delete `components/explore-filters.tsx` + `components/report-button.tsx`; create `app/dashboard/[slug]/page.tsx` (auth-gated asset detail — metadata, version history, content render, delete); convert `app/[owner]/[name]/page.tsx` → redirect or fold into `/dashboard/:slug`; rebuild `app/page.tsx` as marketing/login page (no public listings); simplify `app/dashboard/page.tsx` (remove public badge, add updated_at + stats: Total/Skills/Files/Collections); remove `is_public` from `app/new/page.tsx` + `app/new/new-asset-form.tsx` + `app/new/actions.ts`; remove public badges from `components/asset-card.tsx`
- [x] **P5** Docs: update `CLAUDE.md` (remove public/private arch section, update data model); update `README.md` (private-only framing, no `--public`/`--approve` examples); rewrite `docs/project-outline.md` (remove public registry scope)

---

## Phase 8 — Deploy & End-to-End Test

- [x] **C1** Deploy `apps/web` to Vercel — connect repo, set all env vars
- [x] **C2** Publish `amulets-cli` to npm — verify package name, run `npm publish`
- [x] **C3** End-to-end smoke test (manual, against prod):
  1. `amulets login` → browser opens, GitHub OAuth completes, token saved
  2. `amulets push AGENTS.md -n test-agents -v 1.0.0` → succeeds with slug + version
  3. Create a folder with `SKILL.md` inside; `amulets push ./my-skill -n test-skill -v 1.0.0` → zip uploaded
  4. `amulets pull test-agents` → `.md` file written locally
  5. `amulets pull test-skill` → folder extracted locally
  6. `amulets list` → both assets appear
  7. `amulets versions test-agents` → shows `1.0.0`
  8. Open `amulets.dev/dashboard` → both assets visible; click into one, metadata + content renders
  9. Delete both test assets from the dashboard

---

## Phase 8B — Launch Hardening (Pre-MVP Blockers)

All 8 items were unaddressed as of the post-deploy review. Fix in order before calling the MVP done.

- [x] **L1** Delete `components/asset-card.tsx` and `components/asset-grid.tsx` — both are dead code (not imported anywhere in `app/`); `AssetCard` still links to the deleted `/:owner/:name` route
- [x] **L2** `POST /api/assets` — add regex validation for `slug` (`/^[a-z0-9][a-z0-9-]*[a-z0-9]$/`, min 2 chars, or single char) and `name` fields in both `handleSimplePush` and `handlePackagePush`; return 400 on invalid input
- [x] **L3** `handlePackagePush` — wrap `JSON.parse(metadataStr)` and `JSON.parse(fileManifestStr)` in try/catch; return 400 with `{ error: 'Invalid metadata JSON' }` on parse failure
- [x] **L4** `POST /api/assets` — add semver regex check (`/^\d+\.\d+\.\d+$/`) in both push handlers immediately after the `"latest"` reserved-string check; return 400 with a clear message if invalid
- [x] **L5** Add `DELETE` handler to `app/api/assets/[owner]/[name]/route.ts` — requires auth + ownership; deletes all `asset_versions` rows, removes the zip from the `packages` Storage bucket, deletes the asset record; returns 204. Add a delete button/action to `app/dashboard/[slug]/page.tsx` wired to this endpoint
- [x] **L6** `handlePackagePush` — after the semver check (L4), also reject versions containing `/`, `\`, or `..` to prevent storage path traversal; return 400 with a clear message
- [x] **L7** `POST /api/assets` — add per-user rate limiting: count `asset_versions` rows created by this user in the last 60 seconds; reject with 429 if > 10
- [x] **L8** Replace `apps/web/README.md` boilerplate (create-next-app template) with a project-specific README: what the app is, how to run locally (`pnpm install`, env vars, `pnpm --filter web dev`), link to `CLAUDE.md`

---

## Phase 9 — Post-MVP Improvements

### 9A — CLI

- [ ] **D3** Auto-extract description from YAML frontmatter or first paragraph of markdown on push

### 9B — Web UI

- [ ] **D2** Add zip upload path to `/new` form for skill/bundle packages
- ~~**D4** Explore page: add cursor-based pagination~~ — removed (explore page deleted in 7D)
- [ ] **D5** Dashboard: render collections section (API exists, UI missing)

### 9C — API & Database

- [ ] **D6** Version list: sort by parsed semver rather than `created_at`
- [ ] **D11** Verify delete cascade end-to-end after L5 — confirm DB record, all `asset_versions`, and storage zip are all removed cleanly
- [ ] **D12** Store the original relative path on push (e.g. `.agents/skills/dir`) so `amulets pull` restores to the same path by default
- ~~**D7** Add `updated_at` column to `assets`~~ — covered by P1 migration in 7D
- [ ] **D9** Production-grade rate limiting on push endpoint — Vercel edge rate limiting or a proper middleware layer (L7 covers the basic per-user throttle; this is the production hardening step)
- [ ] **D10** Add user record existence check on `GET /api/me/assets` and `GET /api/me/collections`

### 9D — Docs & Config

- [ ] **D8** Align CLI config path — verify actual path in `config.ts`, update CLAUDE.md and README
- ~~**E1** README — update examples to show `--public`/`--approve`~~ — superseded by P5 in 7D (private-only rewrite)
- ~~**E2** CLAUDE.md — add public/private architecture section~~ — superseded by P5 in 7D
- ~~**E3** `docs/project-outline.md` — update MVP scope to reflect `--approve` flow~~ — superseded by P5 in 7D

---

## Phase 10 — Collections

- [ ] **T45** `POST /api/collections` — create collection
- [ ] **T46** `GET /api/collections/:owner/:name` — collection detail + items
- [ ] **T47** `POST /api/collections/:owner/:name/items` — add asset to collection
- [ ] **T48** `DELETE /api/collections/:owner/:name/items/:id` — remove item
- [ ] **T49** CLI: `amulets collection create <name>`
- [ ] **T50** CLI: `amulets collection add <name> <owner/asset>[@version]`
- [ ] **T51** CLI: `amulets collection pull <name> --output ./`
- [ ] **T52** CLI: `amulets init` (create `.amuletrc`) + `amulets sync` (pull all assets in `.amuletrc`)
- [ ] **T53** Web UI: `/collections/:owner/:name` collection detail page

---

## Phase 11 — Polish & Growth Features

- [ ] **T54** CLI: `amulets inspect <owner/name>` — print file tree of a package without pulling
- [ ] **T55** CLI: `amulets diff <owner/name> <v1> <v2>` — diff two versions
- ~~**T56** Web UI: `/:owner` user profile page~~ — removed (no public profiles in private-only model)
- [ ] **T57** Web UI: version diff view (unified diff for text, file tree diff for packages)
- ~~**T58** Seed registry with high-quality skill packages~~ — removed (no public registry)

---

## Backlog

- Asset ratings (thumbs up)
- Web editor for simple assets
- VS Code extension
- Claude Code MCP server for pulling amulets assets from agent context
- Asset dependencies
- GitHub Action: `amulets sync` on PR
