import { signInWithGitHub } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/server'
import { UserNav } from './user-nav'

export async function HeaderAuth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const username = user.user_metadata?.user_name ?? user.email ?? ''
    const avatarUrl = user.user_metadata?.avatar_url as string | undefined
    return <UserNav username={username} avatarUrl={avatarUrl} />
  }

  return (
    <form action={signInWithGitHub}>
      <Button type="submit">Sign in with GitHub</Button>
    </form>
  )
}
