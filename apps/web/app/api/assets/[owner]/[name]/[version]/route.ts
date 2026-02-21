import { NextResponse } from 'next/server'
import { getAuthUser } from '@/utils/api-auth'
import { createServiceClient } from '@/utils/supabase/service'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; name: string; version: string }> },
) {
  const { owner, name, version } = await params
  const service = createServiceClient()

  const user = await getAuthUser(request)

  const { data: userRecord } = await service
    .from('users')
    .select('id')
    .eq('username', owner)
    .single()

  if (!userRecord) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: asset } = await service
    .from('assets')
    .select('id, asset_format, is_public')
    .eq('owner_id', userRecord.id)
    .eq('slug', name)
    .single()

  if (!asset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isOwner = user?.id === userRecord.id
  const approveHeader = request.headers.get('x-amulets-approve') === 'true'
  const isApprovedPublicPull = asset.is_public && !!user && approveHeader

  // Private asset: only the owner can access
  if (!asset.is_public && !isOwner) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const versionQuery = service
    .from('asset_versions')
    .select('*')
    .eq('asset_id', asset.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const { data: versions } =
    version === 'latest' ? await versionQuery : await versionQuery.eq('version', version)

  const av = versions?.[0]
  if (!av) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Public asset without owner access or approve header: return metadata only
  if (!isOwner && !isApprovedPublicPull) {
    return NextResponse.json({
      version: av.version,
      message: av.message,
      created_at: av.created_at,
      asset_format: asset.asset_format,
      review_url: `https://amulets.dev/${owner}/${name}`,
    })
  }

  // Owner or approved public pull: return full content
  if (asset.asset_format === 'file') {
    return NextResponse.json({ version: av.version, content: av.content })
  }

  // Skill/bundle: return a signed download URL
  const { data: signedUrl, error: storageError } = await service.storage
    .from('packages')
    .createSignedUrl(av.storage_path!, 3600)

  if (storageError || !signedUrl) {
    return NextResponse.json({ error: 'Storage error' }, { status: 500 })
  }

  return NextResponse.json({
    version: av.version,
    download_url: signedUrl.signedUrl,
    file_manifest: av.file_manifest,
  })
}
