import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import type { Command } from 'commander'
import ora from 'ora'
import unzipper from 'unzipper'
import { friendlyApiError, getAssetVersion, getMe } from '../lib/api.js'
import { requireToken } from '../lib/config.js'

async function downloadToBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function unzipBuffer(buffer: Buffer, outputDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Readable.from(buffer)
      .pipe(unzipper.Extract({ path: outputDir }))
      .on('close', resolve)
      .on('error', reject)
  })
}

export function registerPull(program: Command): void {
  program
    .command('pull <name>')
    .description('Pull an asset from the registry (name or owner/name)')
    .option('-o, --output <path>', 'Output file path (simple asset) or directory (package)')
    .option('-v, --version <version>', 'Version to pull (defaults to latest)', 'latest')
    .action(async (nameArg: string, options: { output?: string; version: string }) => {
      const token = await requireToken()

      let owner: string
      let name: string

      const parts = nameArg.split('/')
      if (parts.length === 2 && parts[0] && parts[1]) {
        ;[owner, name] = parts
      } else if (parts.length === 1 && parts[0]) {
        const me = await getMe(token)
        if (!me.username) {
          console.error('Could not resolve your username. Use <owner/name> format instead.')
          process.exit(1)
        }
        owner = me.username
        name = parts[0]
      } else {
        console.error('Error: argument must be a name or <owner/name>')
        process.exit(1)
      }

      const ownerName = `${owner}/${name}`
      const spinner = ora(`Fetching ${ownerName}@${options.version}...`).start()

      try {
        const data = await getAssetVersion(owner, name, options.version, token)

        if (data.content !== undefined) {
          // Simple asset
          const outputPath = options.output ?? (data.filepath || `${name}.md`)
          const resolvedOutput = path.resolve(outputPath)
          fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true })
          fs.writeFileSync(resolvedOutput, data.content, 'utf-8')
          spinner.succeed(`Pulled ${ownerName}@${data.version} → ${outputPath}`)
        } else if (data.download_url) {
          // Skill/bundle package
          const outputDir = options.output ?? (data.filepath || name)
          const resolvedDir = path.resolve(outputDir)
          spinner.text = 'Downloading package...'
          const buffer = await downloadToBuffer(data.download_url)
          spinner.text = 'Extracting...'
          fs.mkdirSync(resolvedDir, { recursive: true })
          await unzipBuffer(buffer, resolvedDir)
          spinner.succeed(`Pulled ${ownerName}@${data.version} → ${outputDir}/`)
        } else {
          spinner.fail('Unexpected response from server')
          process.exit(1)
        }
      } catch (err) {
        spinner.fail(`Pull failed: ${friendlyApiError(err)}`)
        process.exit(1)
      }
    })
}
