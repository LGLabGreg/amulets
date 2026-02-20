'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signInWithGitHubForCLI(callbackUrl: string) {
  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  // After GitHub OAuth completes, /auth/callback will redirect to this next path
  const next = `/cli-auth?callback=${encodeURIComponent(callbackUrl)}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error || !data.url) {
    redirect('/?error=auth')
  }

  redirect(data.url)
}
