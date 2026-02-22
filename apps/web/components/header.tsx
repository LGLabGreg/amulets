import Link from 'next/link'
import { signInWithGitHub } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/server'
import Logo from './logo'
import { ThemeToggle } from './theme-toggle'
import { UserNav } from './user-nav'

export default async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const username = user?.user_metadata?.user_name ?? user?.email ?? ''
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined

  return (
    <header className="border-b bg-background fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link
          href="/"
          className="font-mono text-lg font-semibold tracking-tight flex items-center gap-2"
        >
          <Logo />
          amulets
        </Link>

        <nav className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <UserNav username={username} avatarUrl={avatarUrl} />
          ) : (
            <form action={signInWithGitHub}>
              <Button size="sm" type="submit">
                Sign in with GitHub
              </Button>
            </form>
          )}
        </nav>
      </div>
    </header>
  )
}
