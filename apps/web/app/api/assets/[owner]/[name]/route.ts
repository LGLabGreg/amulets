import { NextResponse } from 'next/server'
import { getAuthUser } from '@/utils/api-auth'
import { createServiceClient } from '@/utils/supabase/service'

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
