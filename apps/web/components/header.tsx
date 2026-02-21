import { Compass } from 'lucide-react'
import Link from 'next/link'
import { signInWithGitHub } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
          <form action="/explore" className="hidden md:flex flex-1 max-w-sm">
            <Input name="q" placeholder="Search amulets…" className="h-8" />
          </form>

          <Button
            nativeButton={false}
            variant="outline"
            className="w-8 px-0 md:w-auto md:px-2.5"
            render={
              <Link href="/explore">
                <Compass />
                <span className="hidden md:inline-flex">Explore</span>
              </Link>
            }
          />
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
      <div className="md:hidden px-4 pb-2">
        <form action="/explore" className="flex flex-1">
          <Input name="q" placeholder="Search amulets…" className="h-8" />
        </form>
      </div>
    </header>
  )
}
