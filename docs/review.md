# Amulet MVP — Code Review

## Summary

Phases 0–6 are complete with solid architecture: clean monorepo structure, well-designed data model, consistent TypeScript throughout, and good separation between simple assets and skill packages. The codebase is ready for deploy with a handful of fixes.

---

## Critical (Fix Before Deploy)

### 1. CLI token expiry is not handled

You store `access_token` but discard `refresh_token`. Supabase access tokens expire after ~1 hour, so every CLI command will silently 401 after that. Store the refresh token and implement refresh before API calls, or at minimum catch 401s and prompt re-login.

**File:** `packages/cli/src/commands/login.ts`

```ts
// Currently:
writeConfig({ token: tokenResponse.access_token });

// Should be:
writeConfig({
  token: tokenResponse.access_token,
  refresh_token: tokenResponse.refresh_token,
  expires_at: Date.now() + tokenResponse.expires_in * 1000,
});
```

Then in `config.ts`, add a `getValidToken()` helper that checks `expires_at` and refreshes if needed.

### 2. Verify the `fts` generated column exists

The search route queries `textSearch('fts', ...)` and the database types include an `fts` field, but none of the migration files in the project knowledge create this generated column. The GIN index in `20260219000004_indexes.sql` indexes a computed expression, not a stored column. If the `fts` column doesn't exist in your Supabase project, search will error.

Ensure you have (or add) a migration:

```sql
ALTER TABLE public.assets ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', name || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX assets_fts_idx ON public.assets USING gin (fts);
```

And drop the redundant computed index from `20260219000004_indexes.sql`.

### 3. Version push is not atomic

In `POST /api/assets`, the asset upsert and version insert are two separate operations. If the version insert fails (e.g. duplicate version string), the asset metadata has already been mutated. For packages, you clean up storage on failure — good — but the asset's `name`, `description`, `type`, or `tags` may have been overwritten by the upsert.

Options:

- Check if the version exists before upserting the asset
- Use a Supabase RPC function that wraps both in a transaction
- At minimum, don't upsert asset metadata fields that shouldn't change on a version push

---

## Security

### 4. No input validation on `type` field

The push route accepts any string for `type`. Validate against the enum:

```ts
const VALID_TYPES = [
  'skill',
  'prompt',
  'cursorrules',
  'agentsmd',
  'config',
] as const;

if (type && !VALID_TYPES.includes(type)) {
  return NextResponse.json(
    { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
    { status: 400 },
  );
}
```

**Files:** `apps/web/app/api/assets/route.ts`, `apps/web/app/new/actions.ts`

### 5. No file size guard on package uploads

`handlePackagePush` reads the full zip into memory via `packageFile.arrayBuffer()`. Vercel serverless has a ~4.5MB body limit by default, which provides some protection, but you should validate explicitly and return a clear error rather than letting it OOM or hit a cryptic Vercel error.

```ts
const MAX_PACKAGE_SIZE = 4 * 1024 * 1024; // 4MB
if (packageFile.size > MAX_PACKAGE_SIZE) {
  return NextResponse.json(
    { error: 'Package exceeds 4MB limit' },
    { status: 413 },
  );
}
```

### 6. No rate limiting on push endpoint

Without any rate limiting, someone could spam uploads and fill your Supabase Storage. Consider Vercel's built-in rate limiting or a simple per-user throttle before launch.

### 7. Missing user record check on GET routes

`GET /api/me/assets` and `GET /api/me/collections` authenticate the user but don't verify a `users` table record exists. A freshly authenticated user who hasn't pushed anything will get empty results (fine) but if any query joins on `users`, it could error. The `POST /api/assets` route handles this with a user upsert, but the read routes don't.

---

## Bugs

### 8. The `latest` version route branch is ambiguous

In `GET /api/assets/:owner/:name/:version`, the string `"latest"` triggers a different query branch. But if someone literally names a version `"latest"`, it would match the wrong branch. Add a note in push validation:

```ts
if (version === 'latest') {
  return NextResponse.json(
    { error: '"latest" is a reserved version identifier' },
    { status: 400 },
  );
}
```

### 9. CLI `pull` uses `require()` inside an ESM module

In `packages/cli/src/commands/pull.ts`:

```ts
const { Readable } = require('node:stream') as typeof import('stream');
```

This will throw in a pure ESM context. Since the CLI package uses `.js` extensions in imports (ESM-style), switch to:

```ts
import { Readable } from 'node:stream';
```

at the top of the file.

### 10. Naming inconsistency: `amulet` vs `amulets`

The CLI binary and npm package use `amulets` (plural), but the README examples, project outline, and docs consistently use `amulet` (singular). The landing page correctly uses `amulets`. Standardise to `amulets` everywhere — the docs and README need updating.

---

## Improvements (Post-Deploy)

### 11. CLI `push --name` should be optional

Currently `--name` is a required option. Default it to the filename (minus extension) or folder name:

```ts
const defaultName = path.basename(resolvedPath, path.extname(resolvedPath));
```

This makes `amulets push ./my-prompt.md` just work.

### 12. Web push form only supports simple assets

`apps/web/app/new/actions.ts` only handles `asset_format: 'file'`. T45 is marked complete but there's no zip upload path in the web UI. Either add it or update the task list to reflect this is CLI-only for packages.

### 13. No description auto-extraction

When pushing a markdown file, you could extract description from YAML frontmatter or the first paragraph. This would improve discoverability without requiring `--description` on every push.

### 14. Explore page isn't truly paginated

The explore page uses `.limit(50)` but has no cursor/offset pagination. Once you have more than 50 assets, users can't see the rest. Add cursor-based pagination using `created_at` before you hit that threshold.

### 15. Dashboard doesn't show collections

`/dashboard` fetches and displays assets but doesn't render the collections section, even though `GET /api/me/collections` exists. The stats row and table only cover assets.

### 16. Version ordering should use semver, not `created_at`

Version lists are ordered by `created_at`. This works as long as versions are pushed sequentially, but if someone pushes a patch to an older version (e.g. `1.0.1` after `2.0.0`), it'll appear at the top. Consider either enforcing monotonic version increments or sorting by parsed semver.

### 17. No `updated_at` on assets

The `assets` table only has `created_at`. When a new version is pushed, the asset's "last updated" time isn't tracked at the asset level — you have to look at the latest version's `created_at`. Adding an `updated_at` column (updated on each version push) would simplify queries for "recently updated" on the landing and explore pages.

### 18. CLI config path inconsistency

`CLAUDE.md` says credentials are stored in `~/.config/amulets/config.json`, but the login command references `~/.config/amulet/config.json` (singular). Verify the actual path in `packages/cli/src/lib/config.ts` and align the docs.

---

## Phase 7 Priority Order

1. **Verify `fts` column** exists in Supabase (or add migration) — search is broken without it
2. **Fix CLI `require()` in pull.ts** — will crash on pull in ESM mode
3. **Add token refresh to CLI** — users will hit 401 within an hour
4. **Reserve `"latest"` as version string** — prevents confusing bugs
5. **Validate `type` enum on push** — data hygiene
6. Deploy to Vercel (T46)
7. Publish CLI to npm (T47)
8. End-to-end smoke test (T48)
