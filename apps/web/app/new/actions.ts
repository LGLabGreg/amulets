'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'

interface CreateAssetValues {
  name: string
  slug: string
  description?: string
  version: string
  message?: string
  content: string
  is_public?: boolean
}

export async function createAssetAction(values: CreateAssetValues): Promise<{ error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized. Please sign in.' }
  }

  const service = createServiceClient()

  // Resolve username for redirect
  const { data: userRecord } = await service
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single()

  const username = userRecord?.username ?? user.id

  const { data: asset, error: assetError } = await service
    .from('assets')
    .upsert(
      {
        owner_id: user.id,
        name: values.name,
        slug: values.slug,
        description: values.description ?? null,
        asset_format: 'file',
        tags: [],
        is_public: values.is_public === true,
      },
      { onConflict: 'owner_id,slug' },
    )
    .select()
    .single()

  if (assetError || !asset) {
    return { error: assetError?.message ?? 'Failed to create asset.' }
  }

  const { error: versionError } = await service.from('asset_versions').insert({
    asset_id: asset.id,
    version: values.version,
    message: values.message ?? null,
    content: values.content,
  })

  if (versionError) {
    return { error: versionError.message }
  }

  redirect(`/${username}/${values.slug}`)
}
