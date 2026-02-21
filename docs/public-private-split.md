# Amulet — Public/Private Architecture Implementation Plan

## Architecture

All assets are private by default. Users can publish public assets via CLI (`--public`) or the web form. Public assets are fully viewable on the website for review. The CLI can pull public assets only with an explicit `--approve` flag. Users are responsible for reviewing public assets before use and for reporting malicious content.

**Website** — browse and review public assets, copy content, report malicious assets
**CLI** — private asset management (push/pull/sync) + approved public pulls

### Trust Model

- **Private assets:** Full CLI access, no friction. You wrote it, you trust it.
- **Public assets:** Viewable on the website. CLI pull requires `--approve`. Users accept responsibility.
- **Reported assets:** Hidden from public view until reviewed by admin.

---

## Database Changes

### D1. Default `is_public` to `false`

```sql
ALTER TABLE public.assets ALTER COLUMN is_public SET DEFAULT false;
```

### D2. Add `reported` flag and reports table

```sql
ALTER TABLE public.assets ADD COLUMN is_reported boolean DEFAULT false NOT NULL;

CREATE TABLE public.asset_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id uuid REFERENCES public.assets (id) ON DELETE CASCADE NOT NULL,
  reporter_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.asset_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert" ON public.asset_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_select_own" ON public.asset_reports
  FOR SELECT USING (auth.uid() = reporter_id);
```

### D3. Update public asset visibility to exclude reported assets

Update the RLS select policy on assets:

```sql
DROP POLICY "assets_select" ON public.assets;

CREATE POLICY "assets_select" ON public.assets
  FOR SELECT USING (
    auth.uid() = owner_id
    OR (is_public = true AND is_reported = false)
  );
```

---

## API Changes

### A1. Lock down content on public asset version endpoint

`GET /api/assets/:owner/:name/:version` — public assets return metadata only (no `content`, no `download_url`). Private assets require auth and ownership check.

Exception: when the request includes auth AND the `x-amulets-approve` header (see A5), return full content for public assets too.

```ts
// apps/web/app/api/assets/[owner]/[name]/[version]/route.ts

const user = await getAuthUser(request);
const isOwner = user && user.id === asset.owner_id;
const isApprovedPublicPull =
  asset.is_public &&
  user &&
  request.headers.get('x-amulets-approve') === 'true';

if (!isOwner && !isApprovedPublicPull) {
  if (asset.is_public) {
    // Public asset: metadata only, direct to website for review
    return NextResponse.json({
      version: av.version,
      message: av.message,
      created_at: av.created_at,
      asset_format: asset.asset_format,
      review_url: `https://amulets.dev/${owner}/${name}`,
    });
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Owner or approved public pull: return full content
// ... existing content/download_url logic
```

### A2. `POST /api/assets` — accept `is_public` from client

Allow the push payload to include `is_public`. Default to `false` if omitted.

```ts
// In handleSimplePush and handlePackagePush:
{
  is_public: body.is_public === true ? true : false,
}
```

### A3. Add report endpoint

```ts
// apps/web/app/api/assets/[owner]/[name]/report/route.ts

export async function POST(request: Request, { params }) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { owner, name } = await params;
  const { reason } = await request.json();

  if (!reason || reason.trim().length === 0) {
    return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
  }

  const service = createServiceClient();

  // Find the asset
  const { data: userRecord } = await service
    .from('users')
    .select('id')
    .eq('username', owner)
    .single();
  if (!userRecord) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: asset } = await service
    .from('assets')
    .select('id, is_public')
    .eq('owner_id', userRecord.id)
    .eq('slug', name)
    .single();

  if (!asset || !asset.is_public) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Insert report
  await service.from('asset_reports').insert({
    asset_id: asset.id,
    reporter_id: user.id,
    reason: reason.trim(),
  });

  // Auto-hide after threshold (e.g. 1 report for now, increase later)
  await service.from('assets').update({ is_reported: true }).eq('id', asset.id);

  return NextResponse.json({ reported: true });
}
```

### A4. Update search endpoint

Already filters `is_public: true`. Add `is_reported: false` filter:

```ts
// apps/web/app/api/assets/search/route.ts
let query = service
  .from('assets')
  .select('*, users(username, avatar_url)')
  .eq('is_public', true)
  .eq('is_reported', false); // Add this
```

### A5. Approve header convention

The CLI signals approval via a custom header `x-amulets-approve: true`. This keeps the approval explicit in the API layer — the server only returns content for public assets when this header is present alongside valid auth.

---

## CLI Changes

### C1. Remove `search` command

Delete `packages/cli/src/commands/search.ts` and unregister from `index.ts`. Discovery happens on the website.

### C2. Add `--approve` gate to `pull`

```ts
// packages/cli/src/commands/pull.ts

export function registerPull(program: Command): void {
  program
    .command('pull <owner/name>')
    .description('Pull an asset from the registry')
    .option('--output <path>', 'Output path')
    .option('--version <version>', 'Version to pull', 'latest')
    .option(
      '--approve',
      'Approve pulling a public asset (required for assets you do not own)',
    )
    .action(async (ownerName, options) => {
      const token = requireToken(); // Always required now

      // ... parse owner/name ...

      const spinner = ora(
        `Fetching ${ownerName}@${options.version}...`,
      ).start();

      try {
        const headers: Record<string, string> = {};
        if (options.approve) {
          headers['x-amulets-approve'] = 'true';
        }

        const data = await getAssetVersion(
          owner,
          name,
          options.version,
          token,
          headers,
        );

        // Server returned metadata-only (public asset without --approve)
        if (data.review_url && !data.content && !data.download_url) {
          spinner.fail(
            `This is a public asset. Review it first, then approve the pull:\n\n` +
              `  Review:  ${data.review_url}\n` +
              `  Pull:    amulets pull ${ownerName} --approve\n`,
          );
          process.exit(1);
        }

        // ... existing download logic ...
      } catch (err) {
        // ...
      }
    });
}
```

### C3. Add `--public` flag to `push`

```ts
// packages/cli/src/commands/push.ts

program
  .command('push <path>')
  .description('Push an asset to the registry')
  .requiredOption('--name <n>', 'Asset name')
  .option('--public', 'Make this asset publicly visible')
  // ... other existing options ...
  .action(async (assetPath, options) => {
    // In the push payload:
    const isPublic = options.public === true;

    // For simple push:
    const result = await pushSimpleAsset(token, {
      // ...existing fields
      is_public: isPublic,
    });

    // For package push metadata:
    formData.append(
      'metadata',
      JSON.stringify({
        // ...existing fields
        is_public: isPublic,
      }),
    );

    const visibility = isPublic ? 'public' : 'private';
    spinner.succeed(
      `Pushed ${visibility} asset: ${result.asset.slug} @ ${result.version.version}`,
    );
  });
```

### C4. Update `api.ts`

Update `getAssetVersion` to accept token and extra headers:

```ts
export async function getAssetVersion(
  owner: string,
  name: string,
  version: string,
  token: string,
  extraHeaders?: Record<string, string>,
): Promise<{
  version: string;
  content?: string;
  download_url?: string;
  file_manifest?: unknown;
  review_url?: string;
}> {
  return request(`/api/assets/${owner}/${name}/${version}`, {
    token,
    headers: extraHeaders,
  });
}
```

Remove `searchAssets` export (search command is gone).

Add `is_public` to `pushSimpleAsset` and `pushPackageAsset` payloads.

### C5. Require auth on all commands

`pull`, `list`, `versions` all call `requireToken()`. No unauthenticated CLI usage.

### C6. Update `.amuletrc` schema for public assets

```json
{
  "assets": [
    { "name": "myuser/my-skill", "output": "./skills/" },
    { "name": "otheruser/their-skill", "output": "./skills/", "approve": true }
  ]
}
```

`amulets sync` skips entries with `approve: true` missing for assets the user doesn't own and prints a warning.

---

## Web UI Changes

### W1. Update public asset detail pages

**File:** `apps/web/app/[owner]/[name]/page.tsx`

Replace the pull command block with two options:

```tsx
{
  /* CLI pull with --approve (copyable) */
}
<div className='border bg-muted/30 px-4 py-3 mb-3'>
  <p className='mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground'>
    Pull via CLI
  </p>
  <div className='flex items-center justify-between'>
    <pre className='font-mono text-sm text-foreground select-all'>
      amulets pull {owner}/{name} --approve
    </pre>
    <CopyButton text={`amulets pull ${owner}/${name} --approve`} />
  </div>
</div>;

{
  /* Copy content button for simple assets */
}
{
  asset.asset_format === 'file' && latest?.content && (
    <div className='border bg-muted/30 px-4 py-3'>
      <p className='mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground'>
        Copy content
      </p>
      <CopyButton text={latest.content} label='Copy to clipboard' />
    </div>
  );
}
```

For private assets (user viewing their own), show the plain pull command without `--approve`.

### W2. Add report button to public asset pages

```tsx
{
  /* Report button — only on public assets, only for logged-in users who don't own it */
}
{
  asset.is_public && session?.user && asset.owner_id !== session.user.id && (
    <ReportButton owner={owner} name={name} />
  );
}
```

Client component:

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ReportButton({ owner, name }: { owner: string; name: string }) {
  const [reported, setReported] = useState(false);
  const [reason, setReason] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function handleReport() {
    const res = await fetch(`/api/assets/${owner}/${name}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) setReported(true);
  }

  if (reported)
    return (
      <p className='text-xs text-muted-foreground'>Reported. Thank you.</p>
    );

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className='text-xs text-muted-foreground hover:text-foreground underline'
      >
        Report this asset
      </button>
    );
  }

  return (
    <div className='space-y-2'>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder='Why are you reporting this asset?'
        className='w-full border bg-background px-3 py-2 text-sm'
        rows={3}
      />
      <div className='flex gap-2'>
        <Button size='sm' onClick={handleReport} disabled={!reason.trim()}>
          Submit report
        </Button>
        <Button size='sm' variant='outline' onClick={() => setShowForm(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

### W3. Add public toggle to `/new` page

Add a checkbox to the create asset form:

```tsx
<label className='flex items-center gap-2 text-sm'>
  <input type='checkbox' name='is_public' />
  Make this asset public
</label>
```

Update `createAssetAction` to accept and pass `is_public`.

### W4. Update landing page

Replace hero examples with private-first messaging:

```
Push, pull, and sync your AI workflow assets across projects.
Browse public skills and prompts shared by the community.
```

Update the "how it works" section:

```
Push an asset          amulets push ./my-prompt.md
Pull anywhere          amulets pull myuser/my-prompt
Pull a public asset    amulets pull dev/docx-skill --approve
```

### W5. Update explore page

Change header to "Public Assets". Add a note:

```tsx
<p className='mt-1 text-sm text-muted-foreground'>
  Review content before use. Pull via CLI with{' '}
  <code className='font-mono text-xs'>--approve</code>.
</p>
```

Filter out reported assets (the RLS policy handles this if using the anon client, but if using the service client add `.eq('is_reported', false)`).

### W6. Dashboard — show public/private badge

Add a badge to each asset row showing visibility:

```tsx
<Badge
  variant={asset.is_public ? 'default' : 'outline'}
  className='font-mono text-xs'
>
  {asset.is_public ? 'public' : 'private'}
</Badge>
```

---

## CLI Help Text

```
amulets push <path>                Push an asset (private by default)
  --name <n>                       Asset name (required)
  --public                         Make publicly visible
  --version <version>              Semver version (default: 1.0.0)
  --message <message>              Version message
  --tags <tags>                    Comma-separated tags
  --type <type>                    skill | prompt | cursorrules | agentsmd | config
  --description <desc>             Short description

amulets pull <owner/name>          Pull an asset
  --output <path>                  Output file or directory
  --version <version>              Pin to version (default: latest)
  --approve                        Required for public assets you don't own

amulets list                       List your assets
amulets versions <owner/name>      List versions of your asset
amulets login                      Authenticate with GitHub
amulets logout                     Log out
amulets whoami                     Show current user
```

Program description:

```ts
program
  .name('amulets')
  .description('Push, pull, and sync AI workflow assets — private by default')
  .version('0.1.0');
```

---

## Docs Updates

### README.md

```bash
# Push a private asset
amulets push ./my-prompt.md --name my-prompt

# Push a public skill package
amulets push ./skills/docx/ --name docx-skill --public

# Pull your own asset (no flag needed)
amulets pull myuser/my-prompt

# Pull a public asset (requires --approve)
amulets pull otheruser/docx-skill --approve

# Browse public assets at amulets.dev/explore
```

### CLAUDE.md — add architecture section

```markdown
## Public/Private Architecture

- All assets are private by default
- Users can publish public assets with `--public` flag or web form toggle
- Public assets are fully viewable on the website for human review
- CLI pull of public assets requires explicit `--approve` flag
- Without `--approve`, the CLI returns a link to the asset page for review
- The `--approve` flag sends `x-amulets-approve: true` header to the API
- Reported assets are hidden from public view (is_reported flag on assets table)
- Report endpoint: POST /api/assets/:owner/:name/report
- .amuletrc entries for non-owned assets require `"approve": true`
```

### project-outline.md

Update MVP scope:

```markdown
### Must Have

- CLI: push, pull, list, versions commands
- Private by default, public opt-in via --public
- CLI pull of public assets requires --approve flag
- Report mechanism for public assets
- ...rest unchanged
```

---

## Implementation Order

1. **D1** — Change default `is_public` to `false` (migration)
2. **D2** — Add `is_reported` column and `asset_reports` table (migration)
3. **D3** — Update RLS policy to exclude reported assets
4. **A2** — Accept `is_public` in push endpoint
5. **A1** — Lock down version endpoint (metadata-only for public without approve header)
6. **A5** — Implement `x-amulets-approve` header check
7. **A3** — Add report endpoint
8. **A4** — Filter reported assets from search
9. **C1** — Remove CLI `search` command
10. **C2** — Add `--approve` gate to CLI pull
11. **C3** — Add `--public` flag to CLI push
12. **C4 + C5** — Update api.ts, require auth everywhere
13. **W1** — Update public asset pages (approve command + copy button)
14. **W2** — Add report button
15. **W3** — Add public toggle to /new page
16. **W4 + W5 + W6** — Update landing, explore, dashboard
17. **C6** — Update `.amuletrc` schema for approve field
18. **Docs** — README, CLAUDE.md, project-outline.md
