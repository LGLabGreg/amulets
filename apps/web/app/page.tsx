import Link from 'next/link'
import { AssetCard } from '@/components/asset-card'
import { Button } from '@/components/ui/button'
import { createServiceClient } from '@/utils/supabase/service'

async function getRecentAssets() {
  const service = createServiceClient()
  const { data } = await service
    .from('assets')
    .select('*, users(username, avatar_url), asset_versions(version, created_at)')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(8)
  return data ?? []
}

export default async function Home() {
  const assets = await getRecentAssets()

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="mb-4 font-mono text-sm text-muted-foreground">amulets.dev</p>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            npm for AI workflow files
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Push, pull, and sync your AI workflow assets across projects. Private by default. Browse
            public skills and prompts shared by the community.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/explore">
              <Button size="sm">Browse registry</Button>
            </Link>
            <a
              href="https://www.npmjs.com/package/amulets-cli"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="font-mono">
                npm install -g amulets-cli
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="mb-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            One command away
          </h2>
          <div className="grid gap-0 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
            <div className="py-4 sm:py-0 sm:px-6 first:pl-0 last:pr-0">
              <p className="mb-2 font-semibold">Push an asset</p>
              <pre className="font-mono text-sm text-muted-foreground">
                amulets push ./my-prompt.md
              </pre>
            </div>
            <div className="py-4 sm:py-0 sm:px-6">
              <p className="mb-2 font-semibold">Pull your asset</p>
              <pre className="font-mono text-sm text-muted-foreground">
                amulets pull myuser/my-prompt
              </pre>
            </div>
            <div className="py-4 sm:py-0 sm:px-6 last:pr-0">
              <p className="mb-2 font-semibold">Pull a public asset</p>
              <pre className="font-mono text-sm text-muted-foreground">
                amulets pull dev/skill --approve
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Recent assets */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Recently published
          </h2>
          <Link
            href="/explore"
            className="text-xs text-muted-foreground hover:text-foreground font-mono"
          >
            View all →
          </Link>
        </div>

        {assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assets yet. Be the first to push one.</p>
        ) : (
          <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4 border border-border divide-y sm:divide-y-0 sm:divide-x divide-border">
            {assets.map((asset) => {
              const versions = asset.asset_versions as { version: string; created_at: string }[]
              const latest = versions?.[0]?.version ?? null
              return (
                <AssetCard
                  key={asset.id}
                  slug={asset.slug}
                  description={asset.description}
                  type={asset.type ?? 'other'}
                  asset_format={asset.asset_format}
                  tags={asset.tags ?? []}
                  owner={asset.users as { username: string; avatar_url: string | null }}
                  latestVersion={latest}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Install strip */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Get started in seconds</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Install the CLI, authenticate with GitHub, and start sharing.
            </p>
          </div>
          <pre className="font-mono text-sm bg-background border border-border px-4 py-2 shrink-0">
            npm install -g amulets-cli
          </pre>
        </div>
      </section>
    </div>
  )
}
