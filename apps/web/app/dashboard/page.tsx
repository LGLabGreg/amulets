import { Plus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'

async function getUserAssets(userId: string) {
  const service = createServiceClient()
  const { data } = await service
    .from('assets')
    .select('*, asset_versions(id, version, created_at)')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const service = createServiceClient()
  const { data: userRecord } = await service
    .from('users')
    .select('username, avatar_url')
    .eq('id', user.id)
    .single()

  const assets = await getUserAssets(user.id)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between border-b pb-6">
        <div className="flex items-center gap-3">
          {userRecord?.avatar_url && (
            <Image
              src={userRecord.avatar_url}
              alt={userRecord.username ?? 'avatar'}
              width={40}
              height={40}
              className="rounded-full"
            />
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {userRecord?.username ?? user.email}
            </h1>
            <p className="text-sm text-muted-foreground">Your amulets</p>
          </div>
        </div>
        <Link href="/new">
          <Button size="sm">
            <Plus />
            New amulet
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 border divide-x divide-border">
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
            Total
          </p>
          <p className="font-mono text-2xl font-bold mt-1">{assets.length}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
            Public
          </p>
          <p className="font-mono text-2xl font-bold mt-1">
            {assets.filter((a) => a.is_public).length}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
            Directories
          </p>
          <p className="font-mono text-2xl font-bold mt-1">
            {assets.filter((a) => a.asset_format !== 'file').length}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
            Files
          </p>
          <p className="font-mono text-2xl font-bold mt-1">
            {assets.filter((a) => a.asset_format === 'file').length}
          </p>
        </div>
      </div>

      {/* Asset table */}
      {assets.length === 0 ? (
        <div className="border py-20 text-center">
          <p className="text-sm text-muted-foreground">No assets yet.</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Push your first asset from the CLI or{' '}
            <Link href="/new" className="underline">
              create one here
            </Link>
            .
          </p>
          <div className="mt-6 inline-block border bg-muted/30 px-4 py-3 text-left">
            <pre className="font-mono text-sm">amulets push ./my-prompt.md</pre>
          </div>
        </div>
      ) : (
        <div className="border">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_80px_80px_100px_100px] border-b bg-muted/50 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span>Name</span>
            <span>Visibility</span>
            <span>Format</span>
            <span>Versions</span>
            <span>Updated</span>
          </div>

          {assets.map((asset, i) => {
            const versions = asset.asset_versions as {
              id: string
              version: string
              created_at: string
            }[]
            const latest = versions[0]
            const isLast = i === assets.length - 1

            return (
              <div
                key={asset.id}
                className={`grid grid-cols-[1fr_80px_80px_100px_100px] px-4 py-3 text-sm items-center hover:bg-muted/30 transition-colors ${!isLast ? 'border-b' : ''}`}
              >
                <div className="min-w-0">
                  <Link
                    href={`/${userRecord?.username}/${asset.slug}`}
                    className="font-mono font-semibold hover:underline truncate block"
                  >
                    {asset.slug}
                  </Link>
                  {asset.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {asset.description}
                    </p>
                  )}
                </div>
                <span>
                  <Badge
                    variant={asset.is_public ? 'default' : 'outline'}
                    className="font-mono text-xs"
                  >
                    {asset.is_public ? 'public' : 'private'}
                  </Badge>
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {asset.asset_format}
                </span>
                <span className="font-mono text-sm">
                  {versions.length}
                  {latest && (
                    <span className="ml-1 text-xs text-muted-foreground">({latest.version})</span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {latest ? new Date(latest.created_at).toLocaleDateString() : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
