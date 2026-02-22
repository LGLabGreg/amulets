# Amulets

Your private AI skills library — push, version, and sync prompts, skills, and rules across every project.

```bash
# Push a skill from anywhere
amulets push AGENTS.md -n agents

# Pull it into any project
amulets pull agents

# Pin to a specific version
amulets pull agents -v 1.2.0
```

Everything stays private. Only you can access your assets.

## Monorepo structure

```
apps/web        # Next.js 16 — web UI + API routes, hosted on Vercel
packages/cli    # TypeScript CLI, published to npm as amulets-cli
```

## Dev setup

**Prerequisites:** Node 18+, pnpm 10+, a Supabase project.

```bash
# Install dependencies
pnpm install

# Set up environment
cp apps/web/.env.example apps/web/.env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Start web dev server
pnpm --filter web dev

# Build CLI
pnpm --filter cli build

# Run tests
pnpm test

# Lint + format
pnpm lint
```

## CLI

```bash
amulets login                     # GitHub OAuth via browser
amulets push <file-or-folder>     # push a file or skill/bundle folder
amulets pull <name>               # pull by name (or owner/name)
amulets list                      # list your assets
amulets versions <name>           # list versions of an asset
amulets whoami                    # show current user
amulets logout                    # remove stored credentials
```

### Push options

```
-n, --name <name>         Asset name (prompted if omitted)
-v, --version <ver>       Semver version [default: 1.0.0]
-m, --message <msg>       Version message
-t, --tags <tags>         Comma-separated tags
-d, --description <desc>  Short description
```

### Pull options

```
-o, --output <path>       Output file or directory
-v, --version <ver>       Version to pull [default: latest]
```

## Asset formats

Amulet handles three formats, auto-detected on push:

| Format | Detection | Storage |
|--------|-----------|---------|
| **file** | Single file | Text in DB |
| **skill** | Directory with `SKILL.md` | Zip in Supabase Storage |
| **bundle** | Any other directory | Zip in Supabase Storage |

## Web app routes

| Route | Description |
|-------|-------------|
| `/` | Marketing/login page |
| `/dashboard` | Your skills library |
| `/dashboard/:slug` | Asset detail, version history, pull command |
| `/new` | Push a file asset via web form |

See `docs/project-outline.md` for full spec and roadmap.
