# Refactor: Asset Format Model (`file | skill | bundle`)

## Overview

Replace the current `asset_format` values (`file | package`) with a clearer three-value model:

- `file` — single markdown file (prompt, AGENTS.md, CLAUDE.md, etc.)
- `skill` — directory containing `SKILL.md` (agentskills.io compliant)
- `bundle` — any other directory (cursor rules set, windsurf rules, etc.)

Also remove the `type` column entirely. Type categorisation will be handled via `tags` instead.

Auto-detection on `amulets push`:

1. Single file passed → `file`
2. Directory with `SKILL.md` → `skill`
3. Directory without `SKILL.md` → `bundle`

> **Deployment note:** The migration drops the `type` column and changes the `asset_format` constraint.
> Apply the migration and deploy updated code atomically (or accept a brief window where the explore
> type filter errors). Do not apply the migration to production before deploying updated app code.

---

## 1. Database Migration

Create a new migration file in `apps/web/supabase/migrations/`.

```sql
-- Rename 'package' → 'skill', allow 'bundle', drop 'type' column

-- Step 1: update existing 'package' rows to 'skill'
-- Safe: the old push command hard-failed on directories without SKILL.md,
-- so all existing 'package' rows are genuine skills.
UPDATE public.assets SET asset_format = 'skill' WHERE asset_format = 'package';

-- Step 2: drop the old check constraint and add the new one
ALTER TABLE public.assets
  DROP CONSTRAINT IF EXISTS assets_asset_format_check;

ALTER TABLE public.assets
  ADD CONSTRAINT assets_asset_format_check
  CHECK (asset_format IN ('file', 'skill', 'bundle'));

-- Step 3: drop the type column
ALTER TABLE public.assets DROP COLUMN IF EXISTS type;
```

---

## 2. TypeScript Types

**File:** `apps/web/lib/database.types.ts`

Update the `asset_format` field references from `'file' | 'package'` to `'file' | 'skill' | 'bundle'` and remove all references to the `type` field from the `assets` Row, Insert, and Update types.

---

## 3. CLI — API Library

**File:** `packages/cli/src/lib/api.ts`

- Update the `Asset` interface: change `asset_format: 'file' | 'package'` to `'file' | 'skill' | 'bundle'` and remove the `type: string | null` field
- Remove `type?: string` from the `pushSimpleAsset` payload type

---

## 4. API — Push Route

**File:** `apps/web/app/api/assets/route.ts`

In `handleSimplePush`:
- Remove `type` from the destructured request body fields
- Remove the `VALID_TYPES` enum and its validation check
- Remove `type` from the asset upsert payload (`type: type ?? null` → gone)

In `handlePackagePush`:
- Remove `type` from the destructured metadata fields
- Remove the `VALID_TYPES` validation check
- Accept `asset_format` from the parsed metadata JSON (the CLI now sends `'skill'` or `'bundle'` explicitly)
- Validate `asset_format` is one of `'skill' | 'bundle'` (reject anything else for this path)
- Replace the hardcoded `asset_format: 'package'` in the upsert with the value received from the CLI
- Remove `type` from the asset upsert payload

Remove the `VALID_TYPES` constant entirely from the file.

---

## 5. API — Pull Route

**File:** `apps/web/app/api/assets/[owner]/[name]/[version]/route.ts`

The existing `if (asset.asset_format === 'file')` logic already correctly falls through to the signed URL path for `skill` and `bundle`, so **no functional changes are needed**. Update the comment on line 75 from `// Package: return a signed download URL` to `// Skill/bundle: return a signed download URL`.

---

## 6. API — Other Routes

Search all API routes under `apps/web/app/api/` for any remaining reference to:

- `asset_format === 'package'` → replace with `asset_format !== 'file'` or explicit `=== 'skill' || === 'bundle'`
- `type` field reads or writes → remove

---

## 7. CLI — Push Command

**File:** `packages/cli/src/commands/push.ts`

Remove the `--type` / `-T` option entirely (from `.option(...)` and from the `options` type).

Replace `isSkillPackage` with `detectFormat`:

```ts
function detectFormat(
  resolvedPath: string,
  isDirectory: boolean,
): 'file' | 'skill' | 'bundle' {
  if (!isDirectory) return 'file';
  if (fs.existsSync(path.join(resolvedPath, 'SKILL.md'))) return 'skill';
  return 'bundle';
}
```

Update the push action:

- Call `detectFormat()` to determine format
- Remove the hard failure when a directory doesn't contain `SKILL.md` — instead treat it as a `bundle`
- Add `asset_format` to the package metadata JSON payload (replace `type`)
- Remove `type` from both the simple asset payload and the package metadata payload
- Both `skill` and `bundle` formats use the zip + file manifest path (same storage mechanism as the old `package`)
- Update success messages:
  - `skill` → `Pushed skill: {slug} @ {version}`
  - `bundle` → `Pushed bundle: {slug} @ {version}`
  - `file` → `Pushed file: {slug} @ {version}` (was `Pushed ${visibility} asset:`)

---

## 8. CLI — Pull Command

**File:** `packages/cli/src/commands/pull.ts`

No functional changes needed. The CLI pull already decides between content vs. download_url based on the API response fields, not by checking `asset_format` directly. No `asset_format === 'package'` checks exist in this file.

---

## 9. Web UI — AssetCard Component

**File:** `apps/web/components/asset-card.tsx`

- Remove the `type` prop from `AssetCardProps` and from the function signature
- Remove the `{type}` badge (the primary `<Badge variant="secondary">` that renders the type string)
- Update the format badge: replace `asset_format === 'package'` check with `asset_format !== 'file'`, and display the actual format value (`skill` or `bundle`) instead of the hardcoded `pkg` label

---

## 10. Web UI — Explore Filters Component

**File:** `apps/web/components/explore-filters.tsx`

This file is not listed in the original plan but is a critical fix — leaving it unchanged causes a runtime DB error when a type filter is active after the column drops.

- Remove the entire "Type" filter section: the `ASSET_TYPES` constant, the `defaultType` prop, the `onTypeChange` handler, and the Type `<Select>` block from the JSX
- Update `FORMATS` from `['file', 'package']` to `['file', 'skill', 'bundle']`
- Remove `defaultType` from `ExploreFiltersProps`

---

## 11. Web UI — Explore Page

**File:** `apps/web/app/explore/page.tsx`

- Remove the `type?: string` field from `SearchParams`
- Remove `if (params.type) query = query.eq('type', params.type)` — querying a dropped column throws a DB error
- Remove `defaultType={params.type}` from the `<ExploreFilters>` call
- Remove the `{params.type && ...}` active-filter chip from the JSX
- Remove `type={asset.type ?? 'other'}` from the `<AssetCard>` call (prop no longer exists)

---

## 12. Web UI — Asset Detail Pages

**Files:**
- `apps/web/app/[owner]/[name]/page.tsx`
- `apps/web/app/[owner]/[name]/[version]/page.tsx`

In both files:

- Remove `type` from the `.select(...)` column list
- Remove any badge or label that renders `{asset.type}`
- Replace `asset_format === 'package'` with `asset_format !== 'file'`
- Update display strings: `'skill package'` → display the actual `asset.asset_format` value

---

## 13. Web UI — Dashboard Page

**File:** `apps/web/app/dashboard/page.tsx`

- Replace the "Packages" stat counter (`asset_format === 'package'`) with `asset_format !== 'file'`; rename the label to "Packages" → "Bundles/Skills" or split into two counters
- Remove the `{asset.type}` badge from the asset table rows
- Remove the "Type" column header from the table header row
- Update both grid template strings (`grid-cols-[1fr_80px_100px_80px_100px_100px]`) to remove the 100px Type column slot — becomes `grid-cols-[1fr_80px_80px_100px_100px]`

---

## 14. Web UI — Homepage CLI Reference

**File:** `apps/web/app/page.tsx`

- Remove the `-T, --type <type>` entry from `PUSH_FLAGS`
- Remove `type={asset.type ?? 'other'}` from both `<AssetCard>` calls in `getRecentAssets` rendering

---

## 15. Web UI — New Asset Form

**Files:** `apps/web/app/new/actions.ts` and `apps/web/app/new/new-asset-form.tsx`

In `actions.ts`:
- Remove `VALID_TYPES` constant and its validation
- Remove `type` from `CreateAssetValues` interface
- Remove `type` from the asset upsert payload

In `new-asset-form.tsx`:
- Remove `ASSET_TYPES` constant
- Remove `type` from the Zod schema and `FormValues` type
- Remove the Type `<Select>` field from the form JSX (the "Type + Version row" grid)
- Update the grid to a single column or move Version to full width

---

## 16. CLAUDE.md

Update the project memory file to reflect the new model:

```md
## Three Asset Formats

1. **file** — single markdown file (prompts, AGENTS.md, CLAUDE.md, .cursorrules, etc.)
2. **skill** — directory containing SKILL.md (agentskills.io compliant)
3. **bundle** — any other directory (cursor rules sets, windsurf rules, etc.)

Auto-detection on `amulets push`:

- Single file → `file`
- Directory with SKILL.md → `skill`
- Directory without SKILL.md → `bundle`

All directory formats (skill + bundle) are stored as zipped archives in Supabase Storage.
The `type` column has been removed. Use `tags` for categorisation instead.
```

---

## 17. Docs

**File:** `docs/project-outline.md`

- Update the Asset Formats section to describe `file | skill | bundle`
- Remove all references to `type` from the data model
- Remove the CLI `--type` option from the commands reference

---

## Checklist

- [ ] Migration written and applied (atomically with code deploy)
- [ ] `database.types.ts` updated (no `type` field, new `asset_format` values)
- [ ] `packages/cli/src/lib/api.ts` updated (`Asset` interface, `pushSimpleAsset` payload)
- [ ] Push API route updated (no `type`, `asset_format` received from CLI, correct validation)
- [ ] Pull API route comment updated (no functional change needed)
- [ ] All other API routes checked for `'package'` or `type` references
- [ ] CLI `push.ts` updated (`detectFormat`, no `--type` flag, `asset_format` in payload, new messages)
- [ ] CLI `pull.ts` confirmed no changes needed
- [ ] `components/asset-card.tsx` updated (remove `type` prop, fix format badge)
- [ ] `components/explore-filters.tsx` updated (remove Type filter, update FORMATS list)
- [ ] `app/explore/page.tsx` updated (remove type query/filter/chip, fix AssetCard call)
- [ ] `app/[owner]/[name]/page.tsx` updated (remove type, fix format checks)
- [ ] `app/[owner]/[name]/[version]/page.tsx` updated (remove type, fix format checks)
- [ ] `app/dashboard/page.tsx` updated (stats counter, remove Type column + badge, fix grid)
- [ ] `app/page.tsx` updated (remove `--type` flag from PUSH_FLAGS, fix AssetCard calls)
- [ ] `app/new/actions.ts` updated (no type field or validation)
- [ ] `app/new/new-asset-form.tsx` updated (remove Type select field)
- [ ] `CLAUDE.md` updated
- [ ] `docs/project-outline.md` updated
