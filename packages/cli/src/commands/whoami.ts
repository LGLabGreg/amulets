import type { Command } from 'commander'
import { getApiUrl, requireToken } from '../lib/config.js'

export function registerWhoami(program: Command): void {
  program
    .command('whoami')
    .description('Show the currently authenticated user')
    .action(async () => {
      const token = await requireToken()
      const apiUrl = getApiUrl()

      try {
        const res = await fetch(`${apiUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          console.error('Not authenticated. Run `amulets login` first.')
          process.exit(1)
        }

        const user = (await res.json()) as { username?: string; id?: string }
        console.log(`Logged in as: ${user.username ?? user.id ?? 'unknown'}`)
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
        process.exit(1)
      }
    })
}
