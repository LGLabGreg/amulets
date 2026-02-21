import { AssetCard } from '@/components/asset-card'

interface Owner {
  username: string
  avatar_url: string | null
}

interface RawAsset {
  id: string
  slug: string
  description: string | null
  asset_format: string
  tags: string[] | null
  asset_versions: { version: string; created_at: string }[] | null
  users?: Owner | null
}

interface AssetGridProps {
  assets: RawAsset[]
  /** Used when `users` is not joined in the query (e.g. owner profile page) */
  defaultOwner?: Owner
  columns?: 3 | 4
  emptyState?: React.ReactNode
}

export function AssetGrid({ assets, defaultOwner, columns = 3, emptyState }: AssetGridProps) {
  if (assets.length === 0) {
    return <>{emptyState ?? <p className="text-sm text-muted-foreground">No assets found.</p>}</>
  }

  const gridClass =
    columns === 4
      ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'

  return (
    <div className={gridClass}>
      {assets.map((asset) => {
        const latestVersion =
          (asset.asset_versions ?? []).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )[0]?.version ?? null

        return (
          <AssetCard
            key={asset.id}
            slug={asset.slug}
            description={asset.description}
            asset_format={asset.asset_format}
            tags={asset.tags ?? []}
            owner={asset.users ?? defaultOwner ?? null}
            latestVersion={latestVersion}
          />
        )
      })}
    </div>
  )
}
