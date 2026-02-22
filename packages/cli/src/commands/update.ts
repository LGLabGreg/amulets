import type { Command } from 'commander'
import { formatUpdateNotice, startUpdateCheck } from '../lib/update-check.js'

export function registerUpdate(program: Command, currentVersion: string): void {
  program
    .command('update')
    .description('Check for a newer version of amulets-cli')
    .action(async () => {
      process.stdout.write(`Current version: ${currentVersion}\n`)
      process.stdout.write('Checking npm registry...\n')

      const latest = await startUpdateCheck(currentVersion, { force: true })

      if (latest) {
        process.stdout.write(formatUpdateNotice(currentVersion, latest))
      } else {
        process.stdout.write(`\n  You are up to date (${currentVersion})\n\n`)
      }
    })
}
