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
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userRecord } = await service
    .from('users')
    .select('id')
    .eq('username', owner)
    .single()

  if (!userRecord || userRecord.id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: asset } = await service
    .from('assets')
    .select('id, asset_format')
    .eq('owner_id', user.id)
    .eq('slug', name)
    .single()

  if (!asset) {
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
