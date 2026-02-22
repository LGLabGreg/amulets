'use client'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const COMMANDS = [
  {
    syntax: 'login',
    desc: 'Authenticate with GitHub via browser',
    flags: [],
  },
  {
    syntax: 'push <path>',
    desc: 'Push an asset (file or skill/bundle folder)',
    flags: [
      { flag: '-n, --name <name>', desc: 'Asset name (prompted if omitted)' },
      { flag: '-v, --version <ver>', desc: 'Semver version (default: 1.0.0)' },
      { flag: '-m, --message <msg>', desc: 'Version message' },
      { flag: '-t, --tags <tags>', desc: 'Comma-separated tags' },
      { flag: '-d, --description <desc>', desc: 'Short description' },
    ],
  },
  {
    syntax: 'pull <name>',
    desc: 'Pull an asset by name or owner/name',
    flags: [
      { flag: '-o, --output <path>', desc: 'Output file or directory' },
      { flag: '-v, --version <ver>', desc: 'Version to pull (default: latest)' },
    ],
  },
  {
    syntax: 'list',
    desc: 'List your assets',
    flags: [],
  },
  {
    syntax: 'versions <name>',
    desc: 'List all versions of an asset',
    flags: [],
  },
  {
    syntax: 'delete <slug>',
    desc: 'Delete an asset and all its versions',
    flags: [{ flag: '-f, --force', desc: 'Skip confirmation prompt' }],
  },
  {
    syntax: 'whoami',
    desc: 'Show the currently authenticated user',
    flags: [],
  },
  {
    syntax: 'logout',
    desc: 'Log out and remove stored credentials',
    flags: [],
  },
]

export function CLIHelpSheet() {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" className="font-mono" />}>
        amulets --help
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="font-mono text-sm">amulets --help</SheetTitle>
        </SheetHeader>

        <div className="divide-y">
          {COMMANDS.map(({ syntax, desc, flags }) => (
            <div key={syntax} className="px-4 py-4 space-y-2">
              <div>
                <p className="font-mono text-xs font-semibold">amulets {syntax}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
              </div>
              {flags.length > 0 && (
                <div className="space-y-1 pt-1">
                  {flags.map(({ flag, desc: flagDesc }) => (
                    <div key={flag} className="grid grid-cols-[auto_1fr] gap-x-3 text-xs">
                      <span className="font-mono text-muted-foreground/70 whitespace-nowrap">
                        {flag}
                      </span>
                      <span className="text-muted-foreground">{flagDesc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
