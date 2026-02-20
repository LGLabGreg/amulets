# Amulet — Phase 7+ Task List

Tasks are ordered for safe sequential execution. Complete each before starting the next.
Sources: `docs/review.md` (R) and `docs/public-private-split.md` (P).

---

## Group A — Critical Bug Fixes (pre-deploy, ~2h)

- [x] **A1** Fix ESM `require()` in CLI pull.ts — replace `require('node:stream')` with a top-level `import` (R-9)
  - File: `packages/cli/src/commands/pull.ts`

- [x] **A2** Add `fts` generated column migration — verify or add the stored tsvector column and GIN index, drop redundant computed index (R-2)
  - File: new migration in `apps/web/supabase/migrations/`

- [x] **A3** Add CLI token refresh — store `refresh_token` + `expires_at` on login, add `getValidToken()` that refreshes before API calls (R-1)
  - Files: `packages/cli/src/commands/login.ts`, `packages/cli/src/lib/config.ts`

- [x] **A4** Reserve `"latest"` as a version string — validate in push endpoint and return 400 (R-8)
  - File: `apps/web/app/api/assets/route.ts`

- [x] **A5** Validate `type` enum on push — reject unknown types with 400 (R-4)
  - Files: `apps/web/app/api/assets/route.ts`, `apps/web/app/new/actions.ts`

- [x] **A6** Add file size guard on package uploads — reject zips > 4MB with 413 before reading into memory (R-5)
  - File: `apps/web/app/api/assets/route.ts`

---

## Group B — Public/Private Architecture (pre-deploy, ~4h)

### B — Database

- [x] **B1** Migration: set `is_public` default to `false` (P-D1)

- [x] **B2** Migration: add `is_reported boolean DEFAULT false` to assets, create `asset_reports` table + RLS policies (P-D2)

- [x] **B3** Migration: update `assets_select` RLS policy to exclude reported assets (P-D3)

### B — API

- [x] **B4** `POST /api/assets` — accept and persist `is_public` from request body (default `false`) (P-A2)

- [x] **B5** `GET /api/assets/:owner/:name/:version` — return metadata-only for public assets unless `x-amulets-approve: true` header + auth is present; owners always get full content (P-A1, P-A5)

- [x] **B6** `POST /api/assets/:owner/:name/report` — new report endpoint; inserts into `asset_reports`, sets `is_reported = true` on the asset (P-A3)

- [x] **B7** `GET /api/assets/search` — add `.eq('is_reported', false)` filter (P-A4)

### B — CLI

- [x] **B8** Remove `search` command — delete `packages/cli/src/commands/search.ts`, unregister from `index.ts` (P-C1)

- [x] **B9** `pull` — add `--approve` flag; send `x-amulets-approve: true` header when set; if server returns `review_url` without content, print message and exit 1 (P-C2)

- [x] **B10** `push` — add `--public` flag; include `is_public` in push payload; show `public`/`private` in success message (P-C3)

- [x] **B11** `api.ts` — update `getAssetVersion` to accept token + extra headers; add `is_public` to `pushSimpleAsset`/`pushPackageAsset`; remove `searchAssets` export (P-C4)

- [x] **B12** Require auth on all CLI commands — `pull`, `list`, `versions` all call `requireToken()` (P-C5)

### B — Web UI

- [x] **B13** `/:owner/:name` — update pull command block: show `amulets pull owner/name --approve` for public assets; add "Copy content" button for simple assets; plain pull for owner's own assets (P-W1)

- [x] **B14** `/:owner/:name` — add `<ReportButton>` client component (visible to logged-in non-owners on public assets) (P-W2)

- [x] **B15** `/new` — add "Make this asset public" checkbox; pass `is_public` through `createAssetAction` (P-W3)

- [x] **B16** Landing page — update hero copy and "how it works" examples to reflect private-first + `--approve` pattern (P-W4)

- [x] **B17** Explore page — rename header to "Public Assets", add note about `--approve`; add `is_reported: false` filter if using service client (P-W5)

- [x] **B18** Dashboard — add public/private badge to each asset row (P-W6)

- [x] **B19** `.amuletrc` schema — N/A, sync command not yet implemented (Phase 8) (P-C6)

---

## Group C — Deploy

- [ ] **C1** Deploy `apps/web` to Vercel — connect repo, set all env vars (T46)

- [ ] **C2** Publish `amulets-cli` to npm — verify package name, run `npm publish` (T47)

- [ ] **C3** End-to-end smoke test: login → push private → pull → push public → pull without `--approve` (expect guidance) → pull with `--approve` → verify (T48)

---

## Group D — Post-Deploy Improvements

- [ ] **D1** CLI: make `--name` optional on push — default to filename/folder name (R-11)

- [ ] **D2** Web UI: add zip upload path to `/new` form for skill packages (R-12)

- [ ] **D3** CLI push: auto-extract description from YAML frontmatter or first paragraph of markdown (R-13)

- [ ] **D4** Explore page: add cursor-based pagination (currently limited to 50) (R-14)

- [ ] **D5** Dashboard: render collections section (API exists, UI missing) (R-15)

- [ ] **D6** Version list: sort by parsed semver rather than `created_at` (R-16)

- [ ] **D7** DB: add `updated_at` column to `assets`, updated on each version push (R-17)

- [ ] **D8** CLI: align config path — verify actual path in `config.ts`, update CLAUDE.md and README (R-18)

- [ ] **D9** API: add rate limiting on push endpoint (Vercel rate limiting or per-user throttle) (R-6)

- [ ] **D10** API: add user record existence check on `GET /api/me/assets` and `GET /api/me/collections` (R-7)

---

## Group E — Docs (do alongside Group C)

- [ ] **E1** README — update examples to show `--public` on push, `--approve` on pull, private-first framing

- [ ] **E2** CLAUDE.md — add public/private architecture section

- [ ] **E3** `docs/project-outline.md` — update MVP scope to reflect private-by-default, `--approve` flow, report mechanism
