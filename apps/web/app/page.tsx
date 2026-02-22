import Link from 'next/link'
import { Container } from '@/components/container'
import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/server'

const HOW_IT_WORKS = [
  {
    step: '1',
    label: 'Push your skill',
    command: 'amulets push AGENTS.md -n agents',
  },
  {
    step: '2',
    label: 'Pull it anywhere',
    command: 'amulets pull agents',
  },
  {
    step: '3',
    label: 'Pin a version',
    command: 'amulets pull agents -v 1.2.0',
  },
] as const

const COMMANDS = [
  { cmd: 'login', desc: 'Authenticate via GitHub' },
  { cmd: 'push <path>', desc: 'Push a file or skill folder' },
  { cmd: 'pull <name>', desc: 'Pull your asset by name' },
  { cmd: 'list', desc: 'List your assets' },
  { cmd: 'versions <name>', desc: 'List all versions' },
  { cmd: 'delete <slug>', desc: 'Delete an asset and all its versions' },
  { cmd: 'whoami', desc: 'Show the current authenticated user' },
  { cmd: 'logout', desc: 'Remove stored credentials' },
] as const

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div>
      {/* Hero */}
      <section className="border-b">
        <Container className="py-16 border-x">
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Your private AI skills, everywhere.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Push, version, and sync prompts, skills, and rules across every project. Everything
            stays private — only you can access your library.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            {user && (
              <Link href="/dashboard">
                <Button>Go to dashboard</Button>
              </Link>
            )}
            <CopyButton text="npm install -g amulets-cli" label="npm install -g amulets-cli" />
            <Button variant="outline" className="font-mono">
              amulets --help
            </Button>
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section className="border-b">
        <Container className="p-0 border-x">
          <div className="grid gap-0 sm:grid-cols-3">
            {HOW_IT_WORKS.map(({ step, label, command }) => (
              <div key={step} className="border-r last:border-r-0 px-4 py-6">
                <p className="mb-2 font-semibold">{label}</p>
                <pre className="font-mono text-xs bg-muted/70 w-fit py-2 px-3 text-balance">
                  {command}
                </pre>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Value props */}
      <section>
        <Container className="p-0 border-x">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x">
            {[
              {
                title: 'Private by default',
                desc: 'Your skills never leave your account. No public listings, no discovery by others.',
              },
              {
                title: 'Version everything',
                desc: 'Push new versions with semver. Pin any project to a specific version and never break.',
              },
              {
                title: 'Works everywhere',
                desc: 'Pull into any project with a single command. Claude Code, Cursor, Windsurf — wherever you work.',
              },
            ].map(({ title, desc }) => (
              <div key={title} className="px-5 py-6 space-y-1">
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Install strip */}
      <section className="border-t bg-muted/30">
        <Container className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-x">
          <div>
            <h2 className="font-semibold">Get started in seconds</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Install the CLI, authenticate with GitHub, and start pushing.
            </p>
          </div>
          <CopyButton text="npm install -g amulets-cli" label="npm install -g amulets-cli" />
        </Container>
      </section>

      {/* CLI Reference */}
      <section className="border-t">
        <Container className="p-0 border-x">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-x">
            {COMMANDS.map(({ cmd, desc }) => (
              <div key={cmd} className="px-4 py-3 space-y-1">
                <p className="font-mono text-xs font-semibold">{cmd}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </div>
  )
}
