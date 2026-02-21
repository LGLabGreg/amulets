import Link from 'next/link'
import { AssetGrid } from '@/components/asset-grid'
import { Container } from '@/components/container'
import { ExploreFilters } from '@/components/explore-filters'
import { createServiceClient } from '@/utils/supabase/service'

interface SearchParams {
  q?: string
  format?: string
}

async function searchAssets(params: SearchParams) {
  const service = createServiceClient()

  let query = service
    .from('assets')
    .select('*, users(username, avatar_url), asset_versions(version, created_at)')
    .eq('is_public', true)
    .eq('is_reported', false)

  if (params.q) {
    query = query.textSearch('fts', params.q, {
      type: 'websearch',
      config: 'english',
    })
  }
  if (params.format) query = query.eq('asset_format', params.format)

  const { data } = await query.order('created_at', { ascending: false }).limit(50)
  return data ?? []
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const assets = await searchAssets(params)

  return (
    <Container>
      {/* Header */}
      <div className="mb-8 border-b pb-6">
        <h1 className="text-2xl font-bold tracking-tight">Public Assets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse public AI workflow assets shared by the community. Review content before use. Pull
          via CLI with <code className="font-mono text-xs">--approve</code>.
        </p>
      </div>

      {/* Search + filters */}
      <ExploreFilters defaultQ={params.q} defaultFormat={params.format} />

      {/* Active filters */}
      {(params.q || params.format) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Showing results for:</span>
          {params.q && (
            <span className="border px-2 py-0.5 font-mono">&ldquo;{params.q}&rdquo;</span>
          )}
          {params.format && (
            <span className="border px-2 py-0.5 font-mono">format: {params.format}</span>
          )}
          <Link href="/explore" className="underline hover:text-foreground">
            Clear
          </Link>
        </div>
      )}

      {/* Results */}
      <div className="mb-3 text-xs text-muted-foreground">
        {assets.length} {assets.length === 1 ? 'result' : 'results'}
      </div>

      <AssetGrid
        assets={assets}
        emptyState={
          <div className="border py-16 text-center">
            <p className="text-sm text-muted-foreground">No assets found.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a different search or{' '}
              <Link href="/new" className="underline">
                push your first asset
              </Link>
              .
            </p>
          </div>
        }
      />
    </Container>
  )
}
