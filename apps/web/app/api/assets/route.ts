import { NextResponse } from 'next/server'
import type { Json } from '@/lib/database.types'
import { getAuthUser } from '@/utils/api-auth'
import { createServiceClient } from '@/utils/supabase/service'

const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/
const SEMVER_RE = /^\d+\.\d+\.\d+$/

function validateSlug(slug: string): string | null {
  if (!slug || !SLUG_RE.test(slug)) {
    return 'slug must be lowercase alphanumeric with hyphens (e.g. my-skill)'
  }
  return null
}

function validateName(name: string): string | null {
  if (!name || name.trim().length === 0) return 'name is required'
  if (name.length > 100) return 'name must be 100 characters or fewer'
  return null
}

function validateVersion(version: string): string | null {
  if (version === 'latest') {
    return '"latest" is a reserved version identifier'
  }
  if (!SEMVER_RE.test(version)) {
    return 'version must be a valid semver string (e.g. 1.0.0)'
  }
  if (version.includes('/') || version.includes('\\') || version.includes('..')) {
    return 'version contains invalid characters'
  }
  return null
}

export async function POST(request: Request) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // Upsert public user record (trigger handles new signups, this covers edge cases)
  await service.from('users').upsert(
    {
      id: user.id,
      username: user.user_metadata?.user_name ?? user.email ?? user.id,
      github_id: user.user_metadata?.provider_id ? Number(user.user_metadata.provider_id) : null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    },
    { onConflict: 'id' },
  )

  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    return handlePackagePush(request, user.id)
  }

  return handleSimplePush(request, user.id)
}

async function checkRateLimit(ownerId: string): Promise<boolean> {
  const service = createServiceClient()
  const since = new Date(Date.now() - 60_000).toISOString()

  const { data: recentAssets } = await service.from('assets').select('id').eq('owner_id', ownerId)

  if (!recentAssets || recentAssets.length === 0) return false

  const assetIds = recentAssets.map((a) => a.id)

  const { count: recentCount } = await service
    .from('asset_versions')
    .select('id', { count: 'exact', head: true })
    .in('asset_id', assetIds)
    .gte('created_at', since)

  return (recentCount ?? 0) > 10
}

async function handleSimplePush(request: Request, ownerId: string) {
  const service = createServiceClient()
  const body = await request.json()
  const { name, slug, description, tags, version, message, content, filename } = body

  if (!name || !slug || !version || !content || !filename) {
    return NextResponse.json(
      { error: 'name, slug, version, content, and filename are required' },
      { status: 400 },
    )
  }

  const slugErr = validateSlug(slug)
  if (slugErr) return NextResponse.json({ error: slugErr }, { status: 400 })

  const nameErr = validateName(name)
  if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 })

  const versionErr = validateVersion(version)
  if (versionErr) return NextResponse.json({ error: versionErr }, { status: 400 })

  const rateLimited = await checkRateLimit(ownerId)
  if (rateLimited) {
    return NextResponse.json(
      { error: 'Rate limit exceeded — too many versions pushed in the last 60 seconds' },
      { status: 429 },
    )
  }

  const { data: asset, error: assetError } = await service
    .from('assets')
    .upsert(
      {
        owner_id: ownerId,
        name,
        slug,
        description: description ?? null,
        asset_format: 'file',
        tags: tags ?? [],
        filename,
      },
      { onConflict: 'owner_id,slug' },
    )
    .select()
    .single()

  if (assetError || !asset) {
    return NextResponse.json(
      { error: assetError?.message ?? 'Failed to create asset' },
      { status: 500 },
    )
  }

  const { data: assetVersion, error: versionError } = await service
    .from('asset_versions')
    .insert({ asset_id: asset.id, version, message: message ?? null, content })
    .select()
    .single()

  if (versionError) {
    return NextResponse.json({ error: versionError.message }, { status: 409 })
  }

  return NextResponse.json({ asset, version: assetVersion }, { status: 201 })
}

async function handlePackagePush(request: Request, ownerId: string) {
  const service = createServiceClient()
  const formData = await request.formData()

  const metadataStr = formData.get('metadata') as string | null
  const fileManifestStr = formData.get('file_manifest') as string | null
  const packageFile = formData.get('package') as File | null

  if (!metadataStr || !fileManifestStr || !packageFile) {
    return NextResponse.json(
      { error: 'metadata, file_manifest, and package are required' },
      { status: 400 },
    )
  }

  let metadata: Record<string, unknown>
  let file_manifest: Json
  try {
    metadata = JSON.parse(metadataStr)
  } catch {
    return NextResponse.json({ error: 'Invalid metadata JSON' }, { status: 400 })
  }
  try {
    file_manifest = JSON.parse(fileManifestStr)
  } catch {
    return NextResponse.json({ error: 'Invalid file_manifest JSON' }, { status: 400 })
  }

  const { name, slug, description, asset_format, tags, version, message, filename } = metadata as {
    name?: string
    slug?: string
    description?: string
    asset_format?: string
    tags?: string[]
    version?: string
    message?: string
    filename?: string
  }

  if (!name || !slug || !version || !filename) {
    return NextResponse.json(
      { error: 'name, slug, version, and filename are required in metadata' },
      { status: 400 },
    )
  }

  const slugErr = validateSlug(slug)
  if (slugErr) return NextResponse.json({ error: slugErr }, { status: 400 })

  const nameErr = validateName(name)
  if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 })

  const versionErr = validateVersion(version)
  if (versionErr) return NextResponse.json({ error: versionErr }, { status: 400 })

  if (!asset_format || !['skill', 'bundle'].includes(asset_format)) {
    return NextResponse.json(
      { error: 'asset_format must be "skill" or "bundle" for directory pushes' },
      { status: 400 },
    )
  }

  const rateLimited = await checkRateLimit(ownerId)
  if (rateLimited) {
    return NextResponse.json(
      { error: 'Rate limit exceeded — too many versions pushed in the last 60 seconds' },
      { status: 429 },
    )
  }

  const { data: asset, error: assetError } = await service
    .from('assets')
    .upsert(
      {
        owner_id: ownerId,
        name,
        slug,
        description: description ?? null,
        asset_format,
        tags: tags ?? [],
        filename,
      },
      { onConflict: 'owner_id,slug' },
    )
    .select()
    .single()

  if (assetError || !asset) {
    return NextResponse.json(
      { error: assetError?.message ?? 'Failed to create asset' },
      { status: 500 },
    )
  }

  const MAX_PACKAGE_SIZE = 4 * 1024 * 1024 // 4MB
  if (packageFile.size > MAX_PACKAGE_SIZE) {
    return NextResponse.json({ error: 'Package exceeds 4MB limit' }, { status: 413 })
  }

  const storagePath = `${ownerId}/${slug}/${version}.zip`
  const buffer = await packageFile.arrayBuffer()

  const { error: storageError } = await service.storage
    .from('packages')
    .upload(storagePath, buffer, {
      contentType: 'application/zip',
      upsert: false,
    })

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 409 })
  }

  const { data: assetVersion, error: versionError } = await service
    .from('asset_versions')
    .insert({
      asset_id: asset.id,
      version,
      message: message ?? null,
      storage_path: storagePath,
      file_manifest,
    })
    .select()
    .single()

  if (versionError) {
    await service.storage.from('packages').remove([storagePath])
    return NextResponse.json({ error: versionError.message }, { status: 409 })
  }

  return NextResponse.json({ asset, version: assetVersion }, { status: 201 })
}
