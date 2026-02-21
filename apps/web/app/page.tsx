import { Compass } from 'lucide-react'
import Link from 'next/link'
import { AssetCard } from '@/components/asset-card'
import { InstallButton } from '@/components/install-button'
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
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-16 border-l">
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Your AI workflows, everywhere
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Push, pull, and sync prompts, skills, and rules across every project. Private by
            default. Share what you want.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/explore">
              <Button size="sm">
                <Compass />
                Explore amulets
              </Button>
            </Link>

            <InstallButton />
          </div>
        </div>
      </section>

      <section className="border-b">
        <div className="mx-auto max-w-6xl border-l">
          <div className="grid gap-0 sm:grid-cols-3">
            {[
              {
                label: 'Push an asset',
                command: 'amulets push AGENTS.md --name agents',
              },
              { label: 'Pull your asset', command: 'amulets pull agents' },
              {
                label: 'Pull a public asset',
                command: 'amulets pull dev/skill --approve',
              },
            ].map(({ label, command }) => (
              <div key={label} className="border-r  px-4 py-6">
                <p className="mb-2 font-semibold">{label}</p>
                <pre className="font-mono text-xs bg-muted/70 w-fit py-2 px-3">{command}</pre>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent assets */}
      <section className="mx-auto max-w-6xl px-4 py-6 border-l">
        <div className="mb-6 flex items-center justify-between border-b pb-3">
          <h2 className="font-semibold">Recently published</h2>
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
          <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4 border divide-y sm:divide-y-0 sm:divide-x divide-border">
            {assets.map((asset) => {
              const versions = asset.asset_versions as {
                version: string
                created_at: string
              }[]
              const latest = versions?.[0]?.version ?? null
              return (
                <AssetCard
                  key={asset.id}
                  slug={asset.slug}
                  description={asset.description}
                  type={asset.type ?? 'other'}
                  asset_format={asset.asset_format}
                  tags={asset.tags ?? []}
                  owner={
                    asset.users as {
                      username: string
                      avatar_url: string | null
                    }
                  }
                  latestVersion={latest}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Install strip */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l">
          <div>
            <h2 className="font-semibold">Get started in seconds</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Install the CLI, authenticate with GitHub, and start sharing.
            </p>
          </div>
          <InstallButton />
        </div>
      </section>
    </div>
  )
}
