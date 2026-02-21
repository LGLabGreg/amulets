import { ChevronRight, Compass } from 'lucide-react'
import Link from 'next/link'

const PUSH_FLAGS = [
  { flag: '-n, --name <name>', desc: 'Asset name', required: true },
  { flag: '-p, --public', desc: 'Make publicly visible' },
  { flag: '-v, --version <ver>', desc: 'Semver version', default: '1.0.0' },
  { flag: '-m, --message <msg>', desc: 'Version message' },
  { flag: '-t, --tags <tags>', desc: 'Comma-separated tags' },
  { flag: '-d, --description <d>', desc: 'Short description' },
] as const

const PULL_FLAGS = [
  { flag: '-o, --output <path>', desc: 'Output file or directory' },
  { flag: '-v, --version <ver>', desc: 'Version to pull', default: 'latest' },
  { flag: '-a, --approve', desc: "Approve a public asset you don't own" },
] as const

const SIMPLE_COMMANDS = [
  { cmd: 'login', desc: 'Authenticate via GitHub' },
  { cmd: 'logout', desc: 'Remove stored credentials' },
  { cmd: 'whoami', desc: 'Show current user' },
  { cmd: 'list', desc: 'List your assets' },
  { cmd: 'versions <owner/name>', desc: 'List all versions' },
] as const

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
        <div className="mx-auto max-w-6xl px-4 py-16 border-x">
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
        <div className="mx-auto max-w-6xl border-x">
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
              <div key={label} className="border-r last:border-r-0 px-4 py-6">
                <p className="mb-2 font-semibold">{label}</p>
                <pre className="font-mono text-xs bg-muted/70 w-fit py-2 px-3 text-balance">
                  {command}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent assets */}
      <section className="mx-auto max-w-6xl px-4 py-6 border-x">
        <div className="mb-6 flex items-center justify-between pb-3">
          <h2 className="font-semibold">Recently published</h2>
          <Button
            nativeButton={false}
            variant="outline"
            render={
              <Link href="/explore">
                View all <ChevronRight />
              </Link>
            }
          ></Button>
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
        <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-x">
          <div>
            <h2 className="font-semibold">Get started in seconds</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Install the CLI, authenticate with GitHub, and start sharing.
            </p>
          </div>
          <InstallButton />
        </div>
      </section>

      {/* CLI Reference */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl border-x">
          {/* push + pull */}
          <div className="grid grid-cols-1 lg:grid-cols-2 border-b divide-y lg:divide-y-0 lg:divide-x">
            {(
              [
                {
                  cmd: 'push',
                  arg: '<path>',
                  desc: 'Push a file or skill package folder to the registry.',
                  flags: PUSH_FLAGS,
                },
                {
                  cmd: 'pull',
                  arg: '<name>',
                  desc: 'Pull an asset by name or owner/name from the registry.',
                  flags: PULL_FLAGS,
                },
              ] as const
            ).map(({ cmd, arg, desc, flags }) => (
              <div key={cmd} className="p-5 space-y-4">
                <div>
                  <p className="font-mono text-sm font-semibold">
                    amulets {cmd} <span className="text-muted-foreground">{arg}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
                </div>
                <div className="space-y-1.5">
                  {flags.map((f) => (
                    <div
                      key={f.flag}
                      className="grid grid-cols-[minmax(0,180px)_1fr] gap-3 text-xs"
                    >
                      <span className="font-mono text-foreground flex items-center gap-1.5">
                        {f.flag}
                        {'required' in f && f.required && (
                          <span className="text-[10px] text-muted-foreground">*</span>
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        {f.desc}
                        {'default' in f && (
                          <span className="ml-1 font-mono text-[10px]">[{f.default}]</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Simple commands */}
          <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x">
            {SIMPLE_COMMANDS.map(({ cmd, desc }) => (
              <div key={cmd} className="px-4 py-3 space-y-1">
                <p className="font-mono text-xs font-semibold">{cmd}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
