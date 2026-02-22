import { createInterface } from 'node:readline'
import type { Command } from 'commander'
import ora from 'ora'
import { deleteAsset, friendlyApiError, getMe } from '../lib/api.js'
import { requireToken } from '../lib/config.js'

export function registerDelete(program: Command): void {
  program
    .command('delete <slug>')
    .description('Delete an asset and all its versions')
    .option('-f, --force', 'skip confirmation prompt')
    .action(async (slug: string, options: { force?: boolean }) => {
      const token = await requireToken()

      if (!options.force) {
        const confirmed = await confirm(
          `Delete "${slug}" and all its versions? This cannot be undone. (y/N) `,
        )
        if (!confirmed) {
          console.log('Aborted.')
          return
        }
      }

      const spinner = ora('Deleting...').start()

      try {
        const { username } = await getMe(token)
        if (!username) throw new Error('Could not determine your username')

        await deleteAsset(username, slug, token)
        spinner.succeed(`Deleted ${slug}`)
      } catch (err) {
        spinner.fail(`Delete failed: ${friendlyApiError(err)}`)
        process.exit(1)
      }
    })
}

function confirm(prompt: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(prompt, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}
