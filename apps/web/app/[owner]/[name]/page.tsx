import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CopyButton } from '@/components/copy-button'
import { FileTree } from '@/components/file-tree'
import { MarkdownContent } from '@/components/markdown-content'
import { ReportButton } from '@/components/report-button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'

interface FileEntry {
  path: string
  size: number
}

interface PageParams {
  owner: string
  name: string
}

async function getAsset(owner: string, name: string) {
  const service = createServiceClient()

  const { data: userRecord } = await service
    .from('users')
    .select('id, username, avatar_url')
    .eq('username', owner)
    .single()

  if (!userRecord) return null

  const { data: asset } = await service
    .from('assets')
    .select(
      '*, asset_versions(id, version, message, content, storage_path, file_manifest, created_at)',
    )
    .eq('owner_id', userRecord.id)
    .eq('slug', name)
    .order('created_at', {
      referencedTable: 'asset_versions',
      ascending: false,
    })
    .single()

  if (!asset) return null

  return { asset, owner: userRecord }
}

export default async function AssetDetailPage({ params }: { params: Promise<PageParams> }) {
  const { owner, name } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const result = await getAsset(owner, name)
  if (!result) notFound()

  const { asset } = result
  const isOwner = !!user && user.id === result.owner.id

  // Private assets are only visible to their owner
  if (!asset.is_public && !isOwner) notFound()

  const versions = asset.asset_versions as {
    id: string
    version: string
    message: string | null
    content: string | null
    storage_path: string | null
    file_manifest: FileEntry[] | null
    created_at: string
  }[]

  const latest = versions[0]
  const showReportButton = asset.is_public && !!user && !isOwner

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
        <span className="text-foreground">{name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0 lg:divide-x divide-border border">
        {/* Main content */}
        <div className="p-6">
          {/* Title row */}
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-mono text-xl font-bold">
                {owner}/{name}
              </h1>
              {asset.description && (
                <p className="mt-1 text-sm text-muted-foreground">{asset.description}</p>
              )}
            </div>
            {latest && (
              <span className="font-mono text-sm text-muted-foreground border px-2 py-0.5">
                v{latest.version}
              </span>
            )}
          </div>

          {/* Badges */}
          <div className="mb-6 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="font-mono text-xs">
              {asset.type}
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              {asset.asset_format === 'package' ? 'skill package' : 'file'}
            </Badge>
            <Badge variant={asset.is_public ? 'default' : 'outline'} className="font-mono text-xs">
              {asset.is_public ? 'public' : 'private'}
            </Badge>
            {(asset.tags ?? []).map((tag: string) => (
              <Badge key={tag} variant="outline" className="font-mono text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Pull command */}
          <div className="mb-4 border bg-muted/30 px-4 py-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Pull via CLI
            </p>
            <pre className="font-mono text-sm text-foreground select-all">
              {isOwner
                ? `amulets pull ${owner}/${name}`
                : `amulets pull ${owner}/${name} --approve`}
            </pre>
          </div>

          {/* Copy content button — only for public simple assets */}
          {asset.is_public && asset.asset_format === 'file' && latest?.content && (
            <div className="mb-8 border bg-muted/30 px-4 py-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Copy content
              </p>
              <CopyButton text={latest.content} label="Copy to clipboard" />
            </div>
          )}

          {/* Content */}
          <div>
            <div className="mb-3 border-b pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {asset.asset_format === 'package' ? 'Files' : 'Content'}
            </div>

            {asset.asset_format === 'package' && latest?.file_manifest ? (
              <FileTree manifest={latest.file_manifest} />
            ) : latest?.content ? (
              <MarkdownContent content={latest.content} />
            ) : (
              <p className="text-sm text-muted-foreground">No content available.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="border-t lg:border-t-0 p-5 space-y-6">
          {/* Owner */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
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

          {/* Stats */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Versions
            </p>
            <p className="font-mono text-2xl font-bold">{versions.length}</p>
          </div>

          {/* Version list */}
          {versions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Version history
              </p>
              <ul className="border divide-y divide-border">
                {versions.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/${owner}/${name}/${v.version}`}
                      className="flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/40 transition-colors"
                    >
                      <span className="font-mono font-semibold">{v.version}</span>
                      <span className="text-muted-foreground">
                        {new Date(v.created_at).toLocaleDateString()}
                      </span>
                    </Link>
                    {v.message && (
                      <p className="px-3 pb-2 text-xs text-muted-foreground">{v.message}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Published */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Published
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(asset.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Report button */}
          {showReportButton && (
            <div>
              <ReportButton owner={owner} name={name} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
