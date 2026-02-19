import Link from 'next/link';
import { signInWithGitHub, signOut } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/utils/supabase/server';

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="font-mono text-lg font-bold tracking-tight">
          amulet
        </Link>

        <form action="/explore" className="flex-1 max-w-sm">
          <Input name="q" placeholder="Search amulets…" className="h-8" />
        </form>

        <nav className="ml-auto flex items-center gap-2">
          <Link href="/explore" className="text-sm text-muted-foreground hover:text-foreground">
            Explore
          </Link>

          {user ? (
            <>
              <Link href="/dashboard">
                {user.user_metadata?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata.user_name ?? 'avatar'}
                    className="h-7 w-7 rounded-full"
                  />
                ) : (
                  <span className="text-sm">{user.email}</span>
                )}
              </Link>
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit">
                  Sign out
                </Button>
              </form>
            </>
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
  );
}
