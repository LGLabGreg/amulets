import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { signInWithGitHubForCLI } from './actions'

function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

export default async function CliAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ callback?: string }>
}) {
  const { callback } = await searchParams

  if (!callback || !isLocalhostUrl(callback)) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-semibold mb-2">Invalid request</h1>
        <p className="text-sm text-muted-foreground">
          Missing or invalid callback URL. Run <span className="font-mono">amulets login</span> from
          your terminal.
        </p>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    const dest = new URL(callback)
    dest.searchParams.set('token', session.access_token)
    dest.searchParams.set('refresh_token', session.refresh_token ?? '')
    dest.searchParams.set('expires_in', String(session.expires_in))
    redirect(dest.toString())
  }

  // Not logged in — trigger GitHub OAuth
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="mb-2 font-mono text-sm text-muted-foreground">amulets.dev</p>
      <h1 className="text-2xl font-semibold mb-4">Authenticate CLI</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Sign in with GitHub to connect your terminal.
      </p>
      <form action={signInWithGitHubForCLI.bind(null, callback)}>
        <button
          type="submit"
          className="inline-flex items-center gap-2 border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Continue with GitHub
        </button>
      </form>
    </div>
  )
}
