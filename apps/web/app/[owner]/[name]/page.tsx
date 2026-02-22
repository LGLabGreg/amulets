import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'

interface PageParams {
  owner: string
  name: string
}

export default async function AssetDetailPage({ params }: { params: Promise<PageParams> }) {
  const { owner, name } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Only the owner can access their assets
  const service = createServiceClient()
  const { data: userRecord } = await service
    .from('users')
    .select('id')
    .eq('username', owner)
    .single()

  if (!userRecord || userRecord.id !== user.id) redirect('/dashboard')

  redirect(`/dashboard/${name}`)
}
