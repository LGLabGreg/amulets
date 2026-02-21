import type { Command } from 'commander'
import ora from 'ora'
import { ApiError, getAssetVersions, getMe } from '../lib/api.js'
import { requireToken } from '../lib/config.js'

export function registerVersions(program: Command): void {
  program
    .command('versions <owner/name>')
    .description('List all versions of an asset')
    .action(async (ownerName: string) => {
      const token = await requireToken()

      let owner: string
      let name: string

      if (ownerName.includes('/')) {
        const parts = ownerName.split('/')
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
          console.error('Error: argument must be in <owner/name> or <name> format')
          process.exit(1)
        }
        owner = parts[0]
        name = parts[1]
      } else {
        const me = await getMe(token)
        if (!me.username) {
          console.error('Error: could not resolve your username — use <owner/name> format')
          process.exit(1)
        }
        owner = me.username
        name = ownerName
      }

      const spinner = ora(`Fetching versions for ${owner}/${name}...`).start()

      try {
        const { versions } = await getAssetVersions(owner, name, token)
        spinner.stop()

        if (versions.length === 0) {
          console.log('No versions found.')
          return
        }

        const versionWidth = Math.max(7, ...versions.map((v) => v.version.length))
        const header = `${'VERSION'.padEnd(versionWidth)}  ${'DATE'.padEnd(20)}  MESSAGE`
        console.log(header)
        console.log('─'.repeat(header.length))

        for (const v of versions) {
          const date = new Date(v.created_at).toISOString().slice(0, 10)
          const msg = v.message ?? '—'
          console.log(`${v.version.padEnd(versionWidth)}  ${date.padEnd(20)}  ${msg}`)
        }
      } catch (err) {
        const message = err instanceof ApiError ? err.message : String(err)
        spinner.fail(`Failed to list versions: ${message}`)
        process.exit(1)
      }
    })
}
