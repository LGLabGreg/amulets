import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { MarkdownContent } from '@/components/markdown-content'
import { FileTree } from '@/components/file-tree'
import { createServiceClient } from '@/utils/supabase/service'

interface FileEntry {
  path: string
  size: number
}

interface PageParams {
  owner: string
  name: string
  version: string
}

async function getVersion(owner: string, name: string, version: string) {
  const service = createServiceClient()

  const { data: userRecord } = await service
    .from('users')
    .select('id, username, avatar_url')
    .eq('username', owner)
    .single()

  if (!userRecord) return null

  const { data: asset } = await service
    .from('assets')
    .select('id, name, slug, description, type, asset_format, tags, created_at')
    .eq('owner_id', userRecord.id)
    .eq('slug', name)
    .eq('is_public', true)
    .single()

  if (!asset) return null

  const versionQuery = service
    .from('asset_versions')
    .select('id, version, message, content, file_manifest, created_at')
    .eq('asset_id', asset.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const { data: versionRows } =
    version === 'latest' ? await versionQuery : await versionQuery.eq('version', version)

  const av = versionRows?.[0]
  if (!av) return null

  return { asset, owner: userRecord, version: av }
}

export default async function VersionDetailPage({ params }: { params: Promise<PageParams> }) {
  const { owner, name, version } = await params
  const result = await getVersion(owner, name, version)

  if (!result) notFound()

  const { asset, version: av } = result

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 text-xs text-muted-foreground font-mono flex items-center gap-1">
        <Link href="/explore" className="hover:text-foreground">
          explore
        </Link>
        <span>/</span>
        <Link href={`/${owner}`} className="hover:text-foreground">
          {owner}
        </Link>
        <span>/</span>
        <Link href={`/${owner}/${name}`} className="hover:text-foreground">
          {name}
        </Link>
        <span>/</span>
        <span className="text-foreground">{av.version}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0 lg:divide-x divide-border border border-border">
        {/* Main */}
        <div className="p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-mono text-xl font-bold">
                {owner}/{name}
              </h1>
              <p className="mt-0.5 font-mono text-sm text-muted-foreground">version {av.version}</p>
              {asset.description && (
                <p className="mt-1 text-sm text-muted-foreground">{asset.description}</p>
              )}
            </div>
            <span className="font-mono text-sm border border-border px-2 py-0.5 text-muted-foreground">
              v{av.version}
            </span>
          </div>

          {/* Badges */}
          <div className="mb-6 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="font-mono text-xs">
              {asset.type}
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              {asset.asset_format === 'package' ? 'skill package' : 'file'}
            </Badge>
            {(asset.tags ?? []).map((tag: string) => (
              <Badge key={tag} variant="outline" className="font-mono text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Pull command for this version */}
          <div className="mb-8 border border-border bg-muted/30 px-4 py-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Pull this version
            </p>
            <pre className="font-mono text-sm text-foreground select-all">
              amulets pull {owner}/{name}@{av.version}
            </pre>
          </div>

          {/* Content */}
          <div>
            <div className="mb-3 border-b border-border pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {asset.asset_format === 'package' ? 'Files' : 'Content'}
            </div>

            {asset.asset_format === 'package' && av.file_manifest ? (
              <FileTree manifest={av.file_manifest as unknown as FileEntry[]} />
            ) : av.content ? (
              <MarkdownContent content={av.content} />
            ) : (
              <p className="text-sm text-muted-foreground">No content available.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="border-t lg:border-t-0 border-border p-5 space-y-6">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              All versions
            </p>
            <Link
              href={`/${owner}/${name}`}
              className="text-xs underline text-muted-foreground hover:text-foreground"
            >
              ← Back to latest
            </Link>
          </div>

          {av.message && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Release notes
              </p>
              <p className="text-xs text-muted-foreground">{av.message}</p>
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Published
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(av.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Owner
            </p>
            <Link
              href={`/${owner}`}
              className="flex items-center gap-2 hover:text-foreground text-sm"
            >
              {result.owner.avatar_url && (
                <Image
                  src={result.owner.avatar_url}
                  alt={owner}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              )}
              <span className="font-mono">{owner}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
