import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Container } from '@/components/container'
import { CopyButton } from '@/components/copy-button'
import { DeleteAssetButton } from '@/components/delete-asset-button'
import { MarkdownContent } from '@/components/markdown-content'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'

interface PageParams {
  slug: string
}

async function getAsset(ownerId: string, slug: string) {
  const service = createServiceClient()

  const { data: asset } = await service
    .from('assets')
    .select('*, asset_versions(id, version, message, content, storage_path, created_at)')
    .eq('owner_id', ownerId)
    .eq('slug', slug)
    .order('created_at', {
      referencedTable: 'asset_versions',
      ascending: false,
    })
    .single()

  return asset ?? null
}

export default async function DashboardAssetPage({ params }: { params: Promise<PageParams> }) {
  const { slug } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const service = createServiceClient()
  const { data: userRecord } = await service
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single()

  const username = userRecord?.username ?? user.id

  const asset = await getAsset(user.id, slug)
  if (!asset) notFound()

  const versions = asset.asset_versions as {
    id: string
    version: string
    message: string | null
    content: string | null
    storage_path: string | null
    created_at: string
  }[]

  const latest = versions[0]

  return (
    <Container>
      {/* Breadcrumb */}
      <nav className="mb-6 text-xs text-muted-foreground font-mono flex items-center gap-1">
        <Link href="/dashboard" className="hover:text-foreground">
          dashboard
        </Link>
        <span>/</span>
        <span className="text-foreground">{slug}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0 lg:divide-x divide-border border">
        {/* Main content */}
        <div className="p-6">
          {/* Title row */}
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-mono text-xl font-bold">
                {username}/{slug}
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
            <Badge variant="outline" className="font-mono text-xs">
              {asset.asset_format}
            </Badge>
            {(asset.tags ?? []).map((tag: string) => (
              <Badge key={tag} variant="outline" className="font-mono text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Actions */}
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <CopyButton
              text={`amulets pull ${username}/${slug}`}
              label={`amulets pull ${username}/${slug}`}
            />
            {asset.asset_format === 'file' && latest?.content && (
              <CopyButton text={latest.content} label="Copy file" />
            )}
            <DeleteAssetButton username={username} slug={slug} />
          </div>

          {/* Content */}
          <div>
            <div className="mb-3 border-b pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Content
            </div>

            {latest?.content ? (
              <MarkdownContent content={latest.content} />
            ) : latest?.storage_path ? (
              <p className="text-sm text-muted-foreground">
                Skill/bundle package —{' '}
                <span className="font-mono">
                  amulets pull {username}/{slug}
                </span>{' '}
                to download.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No content available.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="border-t lg:border-t-0 p-5 space-y-6">
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
                  <li key={v.id} className="px-3 py-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold">{v.version}</span>
                      <span className="text-muted-foreground">
                        {new Date(v.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {v.message && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{v.message}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Path */}
          {asset.filepath && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Path
              </p>
              <p className="font-mono text-xs text-muted-foreground break-all">{asset.filepath}</p>
            </div>
          )}

          {/* Published */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Created
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(asset.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>
    </Container>
  )
}
