import type { Command } from 'commander'
import { getSupabaseUser } from '../lib/auth.js'
import { requireToken } from '../lib/config.js'

export function registerWhoami(program: Command): void {
  program
    .command('whoami')
    .description('Show the currently authenticated user')
    .action(async () => {
      const token = requireToken()

      try {
        const user = await getSupabaseUser(token)
        const username = user.user_metadata?.user_name ?? user.email ?? user.id
        console.log(`Logged in as: ${username}`)
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
        process.exit(1)
      }
    })
}
