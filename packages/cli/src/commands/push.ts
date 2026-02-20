import fs from 'node:fs'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import archiver from 'archiver'
import type { Command } from 'commander'
import ora from 'ora'
import { ApiError, pushPackageAsset, pushSimpleAsset } from '../lib/api.js'
import { requireToken } from '../lib/config.js'

interface FileEntry {
  path: string
  size: number
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function isSkillPackage(folderPath: string): boolean {
  return fs.existsSync(path.join(folderPath, 'SKILL.md'))
}

async function buildFileManifest(folderPath: string): Promise<FileEntry[]> {
  const entries: FileEntry[] = []

  function walk(dir: string, base: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      const relPath = path.join(base, entry.name).replace(/\\/g, '/')
      if (entry.isDirectory()) {
        walk(fullPath, relPath)
      } else {
        const { size } = fs.statSync(fullPath)
        entries.push({ path: relPath, size })
      }
    }
  }

  walk(folderPath, '')
  return entries
}

async function zipFolder(folderPath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } })
    const chunks: Buffer[] = []
    const passThrough = new PassThrough()

    passThrough.on('data', (chunk: Buffer) => chunks.push(chunk))
    passThrough.on('end', () => resolve(Buffer.concat(chunks)))
    passThrough.on('error', reject)

    archive.pipe(passThrough)
    archive.directory(folderPath, false)
    archive.on('error', reject)
    archive.finalize()
  })
}

export function registerPush(program: Command): void {
  program
    .command('push <path>')
    .description('Push an asset (file or skill package folder) to the registry')
    .requiredOption('--name <name>', 'Asset name')
    .option('--public', 'Make this asset publicly visible')
    .option('--version <version>', 'Version (semver)', '1.0.0')
    .option('--message <message>', 'Version message')
    .option('--tags <tags>', 'Comma-separated tags (e.g. claude,prompt)')
    .option('--type <type>', 'Asset type: skill | prompt | cursorrules | agentsmd | config')
    .option('--description <description>', 'Short description')
    .action(
      async (
        assetPath: string,
        options: {
          name: string
          public?: boolean
          version: string
          message?: string
          tags?: string
          type?: string
          description?: string
        },
      ) => {
        const token = await requireToken()
        const isPublic = options.public === true
        const resolvedPath = path.resolve(assetPath)

        if (!fs.existsSync(resolvedPath)) {
          console.error(`Error: path does not exist: ${resolvedPath}`)
          process.exit(1)
        }

        const stats = fs.statSync(resolvedPath)
        const slug = toSlug(options.name)
        const tags = options.tags
          ? options.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : []

        const spinner = ora('Pushing asset...').start()

        try {
          if (stats.isDirectory()) {
            if (!isSkillPackage(resolvedPath)) {
              spinner.fail(
                'Folder must contain SKILL.md to be pushed as a skill package.\n' +
                  'To push a single file, pass the file path instead.',
              )
              process.exit(1)
            }

            spinner.text = 'Building file manifest...'
            const fileManifest = await buildFileManifest(resolvedPath)

            spinner.text = 'Creating zip archive...'
            const zipBuffer = await zipFolder(resolvedPath)

            spinner.text = 'Uploading package...'
            const formData = new FormData()
            formData.append(
              'metadata',
              JSON.stringify({
                name: options.name,
                slug,
                description: options.description,
                type: options.type,
                tags,
                version: options.version,
                message: options.message,
                is_public: isPublic,
              }),
            )
            formData.append('file_manifest', JSON.stringify(fileManifest))
            const zipArrayBuffer = zipBuffer.buffer.slice(
              zipBuffer.byteOffset,
              zipBuffer.byteOffset + zipBuffer.byteLength,
            ) as ArrayBuffer
            formData.append(
              'package',
              new Blob([zipArrayBuffer], { type: 'application/zip' }),
              `${slug}-${options.version}.zip`,
            )

            const result = await pushPackageAsset(token, formData)
            const visibility = isPublic ? 'public' : 'private'
            spinner.succeed(
              `Pushed ${visibility} skill package: ${result.asset.slug} @ ${result.version.version}`,
            )
          } else {
            // Simple asset (single file)
            spinner.text = 'Reading file...'
            const content = fs.readFileSync(resolvedPath, 'utf-8')

            spinner.text = 'Uploading asset...'
            const result = await pushSimpleAsset(token, {
              name: options.name,
              slug,
              description: options.description,
              type: options.type,
              tags,
              version: options.version,
              message: options.message,
              content,
              is_public: isPublic,
            })
            const visibility = isPublic ? 'public' : 'private'
            spinner.succeed(
              `Pushed ${visibility} asset: ${result.asset.slug} @ ${result.version.version}`,
            )
          }
        } catch (err) {
          const message = err instanceof ApiError ? err.message : String(err)
          spinner.fail(`Push failed: ${message}`)
          process.exit(1)
        }
      },
    )
}
