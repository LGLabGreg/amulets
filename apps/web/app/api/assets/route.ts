import { NextResponse } from 'next/server'
import { getAuthUser } from '@/utils/api-auth'
import { createServiceClient } from '@/utils/supabase/service'

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

async function handleSimplePush(request: Request, ownerId: string) {
  const service = createServiceClient()
  const body = await request.json()
  const { name, slug, description, tags, version, message, content, is_public } = body

  if (!name || !slug || !version || !content) {
    return NextResponse.json(
      { error: 'name, slug, version, and content are required' },
      { status: 400 },
    )
  }

  if (version === 'latest') {
    return NextResponse.json(
      { error: '"latest" is a reserved version identifier' },
      { status: 400 },
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
        is_public: is_public === true,
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

  const { name, slug, description, asset_format, tags, version, message, is_public } =
    JSON.parse(metadataStr)
  const file_manifest = JSON.parse(fileManifestStr)

  if (!name || !slug || !version) {
    return NextResponse.json(
      { error: 'name, slug, and version are required in metadata' },
      { status: 400 },
    )
  }

  if (version === 'latest') {
    return NextResponse.json(
      { error: '"latest" is a reserved version identifier' },
      { status: 400 },
    )
  }

  if (!asset_format || !['skill', 'bundle'].includes(asset_format)) {
    return NextResponse.json(
      { error: 'asset_format must be "skill" or "bundle" for directory pushes' },
      { status: 400 },
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
        is_public: is_public === true,
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
