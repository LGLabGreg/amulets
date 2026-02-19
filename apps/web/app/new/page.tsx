import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'
import { NewAssetForm } from './new-asset-form'

export default async function NewAssetPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const service = createServiceClient()
  const { data: userRecord } = await service
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single()

  const username = userRecord?.username ?? user.email ?? 'me'

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 border-b border-border pb-6">
        <h1 className="text-2xl font-bold tracking-tight">New asset</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Publish a simple asset (prompt, cursorrules, markdown file) to the registry.
        </p>
      </div>

      <NewAssetForm username={username} />
    </div>
  )
}
