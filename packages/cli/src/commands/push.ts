import fs from 'node:fs'
import path from 'node:path'
import { createInterface } from 'node:readline/promises'
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

async function promptName(suggestion: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const p = rl.question('? Asset name › ')
    rl.write(suggestion)
    const answer = await p
    return answer.trim() || suggestion
  } finally {
    rl.close()
  }
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function detectFormat(resolvedPath: string, isDirectory: boolean): 'file' | 'skill' | 'bundle' {
  if (!isDirectory) return 'file'
  if (fs.existsSync(path.join(resolvedPath, 'SKILL.md'))) return 'skill'
  return 'bundle'
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

function friendlyPushError(err: unknown, version: string, slug: string): string {
  if (!(err instanceof ApiError)) {
    const msg = String(err)
    if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
      return 'Could not reach the server. Check your internet connection.'
    }
    return msg
  }

  const { status, message } = err

  if (status === 401) return 'Not authenticated. Run `amulets login` first.'
  if (status === 413) return 'Package exceeds the 4 MB size limit.'
  if (message.includes('cannot be made public')) return message
  if (
    status === 409 ||
    message.includes('duplicate key') ||
    message.includes('unique constraint')
  ) {
    return `Version ${version} of "${slug}" already exists. Use -v to specify a different version (e.g. -v 1.0.1).`
  }
  if (message.includes('"latest"')) {
    return '"latest" is a reserved version name. Use a semver version like 1.0.0.'
  }
  if (status >= 500) return 'Server error. Please try again later.'
  return message
}

export function registerPush(program: Command): void {
  program
    .command('push <path>')
    .description('Push an asset (file or skill/bundle folder) to the registry')
    .option('-n, --name <name>', 'Asset name')
    .option('-p, --public', 'Make this asset publicly visible')
    .option('-v, --version <version>', 'Version (semver)', '1.0.0')
    .option('-m, --message <message>', 'Version message')
    .option('-t, --tags <tags>', 'Comma-separated tags (e.g. claude,prompt)')
    .option('-d, --description <description>', 'Short description')
    .action(
      async (
        assetPath: string,
        options: {
          name?: string
          public?: boolean
          version: string
          message?: string
          tags?: string
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
        const isDirectory = stats.isDirectory()
        const format = detectFormat(resolvedPath, isDirectory)

        const suggestion = toSlug(
          isDirectory
            ? path.basename(resolvedPath)
            : path.basename(resolvedPath, path.extname(resolvedPath)),
        )
        const name = options.name ?? (await promptName(suggestion))
        if (!name) {
          console.error('Error: asset name is required')
          process.exit(1)
        }

        const slug = toSlug(name)
        const tags = options.tags
          ? options.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : []

        if (isPublic && format !== 'file') {
          console.error(
            `Error: only file assets can be made public. Skill and bundle packages are always private.`,
          )
          process.exit(1)
        }

        const spinner = ora('Pushing asset...').start()

        try {
          if (format === 'skill' || format === 'bundle') {
            spinner.text = 'Building file manifest...'
            const fileManifest = await buildFileManifest(resolvedPath)

            spinner.text = 'Creating zip archive...'
            const zipBuffer = await zipFolder(resolvedPath)

            spinner.text = 'Uploading package...'
            const formData = new FormData()
            formData.append(
              'metadata',
              JSON.stringify({
                name,
                slug,
                description: options.description,
                asset_format: format,
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
              `Pushed ${visibility} ${format}: ${result.asset.slug} @ ${result.version.version}`,
            )
          } else {
            // Simple asset (single file)
            spinner.text = 'Reading file...'
            const content = fs.readFileSync(resolvedPath, 'utf-8')

            spinner.text = 'Uploading asset...'
            const result = await pushSimpleAsset(token, {
              name,
              slug,
              description: options.description,
              tags,
              version: options.version,
              message: options.message,
              content,
              is_public: isPublic,
            })
            const visibility = isPublic ? 'public' : 'private'
            spinner.succeed(
              `Pushed ${visibility} file: ${result.asset.slug} @ ${result.version.version}`,
            )
          }
        } catch (err) {
          spinner.fail(`Push failed: ${friendlyPushError(err, options.version, slug)}`)
          process.exit(1)
        }
      },
    )
}
