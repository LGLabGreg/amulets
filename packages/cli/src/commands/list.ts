import type { Command } from 'commander'
import ora from 'ora'
import { friendlyApiError, listMyAssets } from '../lib/api.js'
import { requireToken } from '../lib/config.js'

export function registerList(program: Command): void {
  program
    .command('list')
    .description('List your assets')
    .action(async () => {
      const token = await requireToken()
      const spinner = ora('Fetching your assets...').start()

      try {
        const { assets } = await listMyAssets(token)
        spinner.stop()

        if (assets.length === 0) {
          console.log('No assets found. Use `amulets push` to add one.')
          return
        }

        const rows = assets.map((a) => {
          const versions = a.asset_versions ?? []
          const latest = versions[0]?.version ?? '—'
          const count = versions.length
          return { name: a.slug, format: a.asset_format, latest, versions: count }
        })

        const nameWidth = Math.max(4, ...rows.map((r) => r.name.length))
        const formatWidth = Math.max(6, ...rows.map((r) => r.format.length))

        const header = `${'NAME'.padEnd(nameWidth)}  ${'FORMAT'.padEnd(formatWidth)}  ${'LATEST'.padEnd(8)}  VERSIONS`
        console.log(header)
        console.log('─'.repeat(header.length))

        for (const r of rows) {
          console.log(
            `${r.name.padEnd(nameWidth)}  ${r.format.padEnd(formatWidth)}  ${r.latest.padEnd(8)}  ${r.versions}`,
          )
        }
      } catch (err) {
        spinner.fail(`Failed to list assets: ${friendlyApiError(err)}`)
        process.exit(1)
      }
    })
}
