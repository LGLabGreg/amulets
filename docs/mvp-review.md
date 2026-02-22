# Priority Fixes — Launch Readiness

Work through these in order. Each fix is small and scoped.

---

## 1. Fix `AssetCard` broken links

`components/asset-card.tsx` links to `/${owner?.username}/${slug}` — these routes were deleted in the private-only refactor (P4). Change href to `/dashboard/${slug}`. If `AssetCard` and `AssetGrid` are unused dead code, delete both files instead.

## 2. Server-side slug validation on push endpoint

`app/api/assets/route.ts` — both `handleSimplePush` and `handlePackagePush` trust the `slug` from the client. Add a regex check (`/^[a-z0-9][a-z0-9-]*[a-z0-9]$/` or similar, min 1 char) and return 400 if invalid. Do the same for `name`.

## 3. Wrap JSON.parse in handlePackagePush

`app/api/assets/route.ts` → `handlePackagePush` — the `JSON.parse(metadataStr)` and `JSON.parse(fileManifestStr)` calls are unwrapped. Wrap both in try/catch and return `{ error: 'Invalid metadata JSON' }` with status 400 on parse failure.

## 4. Server-side semver validation on push

`app/api/assets/route.ts` — both push handlers accept `version` from the client. Add a semver regex check (`/^\d+\.\d+\.\d+$/`) after the `"latest"` reserved check. Return 400 with a clear message if invalid.

## 5. Verify DELETE route exists

Check that `app/api/assets/[owner]/[name]/route.ts` has a `DELETE` handler that:

- Requires auth + ownership
- Deletes all `asset_versions` for the asset
- Removes any zip files from Supabase Storage (`packages` bucket)
- Deletes the asset record
- Returns 200 or 204

If missing, implement it. Also verify the dashboard asset detail page (`app/dashboard/[slug]/page.tsx`) has a delete button/action wired to this endpoint.

## 6. Add version field validation on push (storage path safety)

In `handlePackagePush`, the storage path is `${ownerId}/${slug}/${version}.zip`. The `version` value comes from user input. After the semver regex check (fix #4), also reject versions containing `/`, `\`, or `..` as an extra safety layer.

## 7. Add basic rate limiting on push endpoint

Add a simple per-user rate limit to `POST /api/assets`. Options:

- Vercel's `@vercel/functions` rate limiting if available
- Or a simple approach: check `asset_versions` count created by this user in the last minute, reject if > 10

This doesn't need to be sophisticated — just enough to prevent abuse.

## 8. Replace default web README

`apps/web/README.md` is still the create-next-app boilerplate. Replace with a brief project-specific README covering:

- What this app is (Amulets web dashboard + API)
- How to run locally (`pnpm install`, env vars, `pnpm --filter web dev`)
- Link to `CLAUDE.md` for full conventions

---

## Not blocking launch (Phase 9 backlog)

These are tracked in `docs/tasks.md` Phase 9 and don't need to be done now:

- D1: Make `--name` optional on push
- D2: Zip upload on `/new` form
- D3: Auto-extract description from frontmatter
- D5: Collections UI
- D6: Semver-sorted version lists
- D9: Production rate limiting (beyond the basic check above)
- D10: User record existence check on `/api/me/*`
