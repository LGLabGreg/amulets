# Amulets — Claude Code Instructions

## Maintenance

This file is maintained by Claude. When a conversation reveals a non-obvious pattern, architectural decision, or gotcha that would affect future work, propose adding it here: _"This pattern would be useful in CLAUDE.md — should I add it?"_ Equally, flag anything that has become stale or obvious and suggest removing it. Only update the file when the user confirms.

## Project Overview

A CLI-first **private** skill management platform for AI workflow assets (prompts, skills, `.cursorrules`, `AGENTS.md`).
All assets are private — only the owner can access them. No public registry, no public browsing.

## Package Manager

**Always use `pnpm`.** Never use npm or yarn.

**Always install packages with `@latest`** — never hardcode a version number from memory. Training data versions are stale.

```bash
pnpm --filter web add some-package@latest
pnpm --filter amulets-cli add some-package@latest
```

## Code Style

- **Biome** for linting and formatting (not ESLint/Prettier)
- No `any` unless absolutely unavoidable

## Database

- Migrations in `apps/web/supabase/migrations/`
- **Use the Supabase MCP server** to apply migrations and query the database directly — it is configured in `~/.claude.json` and available in Claude Code sessions
- **Never manually edit `apps/web/lib/database.types.ts`** — it is auto-generated from the live schema. If types and code conflict, the code is wrong; fix the code or write a migration

## Key Architectural Decisions

- **All assets are private** — only the owner can read, write, or pull their assets. No public access.
- **All API routes require authentication** — use `getAuthUser(request)` at the top of every route; return 401 if missing.
- **Simple assets** (single `.md` file): content stored as text in `AssetVersion.content`
- **Skill/bundle packages** (folder): zipped and stored in Supabase Storage; `file_manifest` JSONB column holds file tree for UI rendering without unzipping
- **API large file handling**: for skill/bundle pulls, API returns a signed Supabase Storage URL — CLI downloads directly from storage, not proxied through Next.js
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

## Static Pages with Auth-Dependent UI

Pages that are mostly static (e.g. `/`) must **not** call `supabase.auth.getUser()` at the page level — that opts the entire route out of static rendering and blocks the initial HTML.

**Pattern:** extract auth-dependent UI into a small `async` server component, wrap it in `<Suspense>`. The static shell renders and streams immediately; the auth-gated content streams in separately.

```tsx
// ✅ Correct — page is static, button streams in
async function DashboardButton() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return (
    <Link href='/dashboard'>
      <Button>Go to dashboard</Button>
    </Link>
  )
}

export default function Page() {
  return (
    <>
      <StaticContent />
      <Suspense fallback={null}>
        <DashboardButton />
      </Suspense>
    </>
  )
}

// ❌ Wrong — makes the entire page dynamic
export default async function Page() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return <>{user && <Link href='/dashboard'>...</Link>}</>
}
```

The same rule applies to any component rendered in the root layout (e.g. `Header`) — auth-dependent parts are isolated in `HeaderAuth` wrapped in `<Suspense>`.

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
