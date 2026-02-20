import type { Command } from 'commander'
import ora from 'ora'
import { ApiError, listMyAssets } from '../lib/api.js'
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
          const format = a.asset_format === 'package' ? 'pkg' : 'file'
          return { name: a.slug, format, type: a.type ?? '—', latest, versions: count }
        })

        const nameWidth = Math.max(4, ...rows.map((r) => r.name.length))
        const typeWidth = Math.max(4, ...rows.map((r) => r.type.length))

        const header = `${'NAME'.padEnd(nameWidth)}  ${'FMT'.padEnd(4)}  ${'TYPE'.padEnd(typeWidth)}  ${'LATEST'.padEnd(8)}  VERSIONS`
        console.log(header)
        console.log('─'.repeat(header.length))

        for (const r of rows) {
          console.log(
            `${r.name.padEnd(nameWidth)}  ${r.format.padEnd(4)}  ${r.type.padEnd(typeWidth)}  ${r.latest.padEnd(8)}  ${r.versions}`,
          )
        }
      } catch (err) {
        const message = err instanceof ApiError ? err.message : String(err)
        spinner.fail(`Failed to list assets: ${message}`)
        process.exit(1)
      }
    })
}
