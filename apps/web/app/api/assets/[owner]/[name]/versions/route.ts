import { NextResponse } from 'next/server'
import { getAuthUser } from '@/utils/api-auth'
import { createServiceClient } from '@/utils/supabase/service'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> },
) {
  const { owner, name } = await params
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
    .select('id')
    .eq('owner_id', user.id)
    .eq('slug', name)
    .single()

  if (!asset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: versions, error } = await service
    .from('asset_versions')
    .select('id, version, message, created_at')
    .eq('asset_id', asset.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ versions })
}
