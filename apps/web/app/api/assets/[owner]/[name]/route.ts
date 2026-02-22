import { NextResponse } from 'next/server'
import { getAuthUser } from '@/utils/api-auth'
import { createServiceClient } from '@/utils/supabase/service'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> },
) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { owner, name } = await params
  const service = createServiceClient()

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

  // Remove zips from storage for skill/bundle assets
  if (asset.asset_format === 'skill' || asset.asset_format === 'bundle') {
    const { data: versions } = await service
      .from('asset_versions')
      .select('storage_path')
      .eq('asset_id', asset.id)
      .not('storage_path', 'is', null)

    const paths = (versions ?? []).map((v) => v.storage_path).filter((p): p is string => p !== null)

    if (paths.length > 0) {
      await service.storage.from('packages').remove(paths)
    }
  }

  // Delete asset_versions (cascade would handle this, but be explicit)
  await service.from('asset_versions').delete().eq('asset_id', asset.id)

  const { error: deleteError } = await service
    .from('assets')
    .delete()
    .eq('id', asset.id)
    .eq('owner_id', user.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> },
) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { owner, name } = await params
  const service = createServiceClient()

  const { data: userRecord } = await service
    .from('users')
    .select('id')
    .eq('username', owner)
    .single()

  if (!userRecord || userRecord.id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: asset, error } = await service
    .from('assets')
    .select('*, users(username, avatar_url), asset_versions(id, version, message, created_at)')
    .eq('owner_id', user.id)
    .eq('slug', name)
    .order('created_at', {
      referencedTable: 'asset_versions',
      ascending: false,
    })
    .single()

  if (error || !asset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ asset })
}
