import { NextResponse } from 'next/server'
import { getAuthUser } from '@/utils/api-auth'
import { createServiceClient } from '@/utils/supabase/service'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> },
) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { owner, name } = await params
  const body = await request.json()
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

  if (!reason) {
    return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
  }

  const service = createServiceClient()

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
    .select('id, is_public')
    .eq('owner_id', userRecord.id)
    .eq('slug', name)
    .single()

  if (!asset || !asset.is_public) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await service.from('asset_reports').insert({
    asset_id: asset.id,
    reporter_id: user.id,
    reason,
  })

  // Auto-hide after first report — increase threshold later
  await service.from('assets').update({ is_reported: true }).eq('id', asset.id)

  return NextResponse.json({ reported: true })
}
