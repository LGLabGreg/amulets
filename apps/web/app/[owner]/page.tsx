import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AssetCard } from '@/components/asset-card'
import { Container } from '@/components/container'
import { createServiceClient } from '@/utils/supabase/service'

interface PageParams {
  owner: string
}

async function getOwnerWithAssets(username: string) {
  const service = createServiceClient()

  const { data: userRecord } = await service
    .from('users')
    .select('id, username, avatar_url')
    .eq('username', username)
    .single()

  if (!userRecord) return null

  const { data: assets } = await service
    .from('assets')
    .select('id, slug, description, asset_format, tags, asset_versions(version, created_at)')
    .eq('owner_id', userRecord.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  return { owner: userRecord, assets: assets ?? [] }
}

export default async function OwnerPage({ params }: { params: Promise<PageParams> }) {
  const { owner: username } = await params
  const result = await getOwnerWithAssets(username)

  if (!result) notFound()

  const { owner, assets } = result

  return (
    <Container>
      {/* Breadcrumb */}
      <nav className="mb-6 text-xs text-muted-foreground font-mono flex items-center gap-1">
        <Link href="/explore" className="hover:text-foreground">
          explore
        </Link>
        <span>/</span>
        <span className="text-foreground">{username}</span>
      </nav>

      {/* Profile header */}
      <div className="mb-8 flex items-center gap-4">
        {owner.avatar_url && (
          <Image
            src={owner.avatar_url}
            alt={username}
            width={56}
            height={56}
            className="rounded-full"
          />
        )}
        <div>
          <h1 className="font-mono text-xl font-bold">{username}</h1>
          <p className="text-sm text-muted-foreground">
            {assets.length} public {assets.length === 1 ? 'asset' : 'assets'}
          </p>
        </div>
      </div>

      {/* Asset grid */}
      {assets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No public assets yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset) => {
            const versions = asset.asset_versions as {
              version: string
              created_at: string
            }[]
            const latest = versions?.sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )[0]

            return (
              <AssetCard
                key={asset.id}
                slug={asset.slug}
                description={asset.description}
                asset_format={asset.asset_format}
                tags={asset.tags ?? []}
                owner={{ username, avatar_url: owner.avatar_url }}
                latestVersion={latest?.version ?? null}
              />
            )
          })}
        </div>
      )}
    </Container>
  )
}
