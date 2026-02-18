# Amulet

A version-controlled registry for AI workflow assets — prompts, skills, `.cursorrules`, `AGENTS.md`, and skill packages conforming to the [agentskills.io](https://agentskills.io) spec.

Think npm, but for AI workflow files.

```bash
# Push a skill package
amulet push ./skills/docx/ --name docx-skill

# Pull it into any project
amulet pull lglab/docx-skill --output ./skills/
```

## Monorepo structure

```
apps/web        # Next.js 15 — web UI + API routes, hosted on Vercel
packages/cli    # TypeScript CLI, published to npm as amulet-cli
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
pnpm dev

# Run tests
pnpm test

# Lint + format
pnpm check
```

## CLI

```bash
amulet login                          # GitHub OAuth via browser
amulet push <file-or-folder>          # push an asset or skill package
amulet pull <owner/name>              # pull an asset
amulet list                           # list your assets
amulet search <query>                 # search the registry
```

See `docs/project-outline.md` for full spec and roadmap.
