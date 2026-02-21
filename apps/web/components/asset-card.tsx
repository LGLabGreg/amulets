import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface AssetCardProps {
  slug: string
  description: string | null
  type: string
  asset_format: string
  tags: string[]
  owner: { username: string; avatar_url: string | null } | null
  latestVersion?: string | null
}

export function AssetCard({
  slug,
  description,
  type,
  asset_format,
  tags,
  owner,
  latestVersion,
}: AssetCardProps) {
  const href = `/${owner?.username ?? '_'}/${slug}`

  return (
    <Link href={href} className="group block border p-4 hover:bg-muted/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-sm font-semibold text-foreground group-hover:underline truncate">
          {owner?.username}/{slug}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground font-mono">
          {latestVersion ?? '—'}
        </span>
      </div>

      {description && (
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="text-xs font-mono">
          {type}
        </Badge>
        {asset_format === 'package' && (
          <Badge variant="outline" className="text-xs font-mono">
            pkg
          </Badge>
        )}
        {tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs font-mono">
            {tag}
          </Badge>
        ))}
      </div>
    </Link>
  )
}
