import { NextResponse } from 'next/server'
import { getAuthUser } from '@/utils/api-auth'
import { createServiceClient } from '@/utils/supabase/service'

export async function GET(request: Request) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data } = await service
    .from('users')
    .select('username, avatar_url')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    id: user.id,
    username: data?.username ?? null,
    avatar_url: data?.avatar_url ?? null,
  })
}
