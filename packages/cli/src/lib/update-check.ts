import https from 'node:https'
import { readConfig, writeConfig } from './config.js'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const FETCH_TIMEOUT_MS = 5_000

function fetchLatestVersion(packageName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      `https://registry.npmjs.org/${packageName}/latest`,
      { headers: { Accept: 'application/json' } },
      (res) => {
        let body = ''
        res.on('data', (chunk: string) => {
          body += chunk
        })
        res.on('end', () => {
          try {
            const data = JSON.parse(body) as { version: string }
            resolve(data.version)
          } catch {
            reject(new Error('Failed to parse npm registry response'))
          }
        })
      },
    )
    req.setTimeout(FETCH_TIMEOUT_MS, () => {
      req.destroy()
      reject(new Error('npm registry request timed out'))
    })
    req.on('error', reject)
  })
}

function isNewer(current: string, latest: string): boolean {
  const parse = (v: string) => v.split('.').map(Number)
  const [cMaj, cMin, cPat] = parse(current)
  const [lMaj, lMin, lPat] = parse(latest)
  if ([cMaj, cMin, cPat, lMaj, lMin, lPat].some((n) => !Number.isFinite(n))) return false
  if (lMaj !== cMaj) return lMaj > cMaj
  if (lMin !== cMin) return lMin > cMin
  return lPat > cPat
}

export async function startUpdateCheck(
  currentVersion: string,
  options: { force?: boolean } = {},
): Promise<string | null> {
  try {
    const config = readConfig()
    const now = Date.now()
    const stale = !config?.lastUpdateCheck || now - config.lastUpdateCheck > CACHE_TTL_MS

    if (!options.force && !stale && config?.latestVersion) {
      return isNewer(currentVersion, config.latestVersion) ? config.latestVersion : null
    }

    const latest = await fetchLatestVersion('amulets-cli')

    if (config?.token) {
      writeConfig({ ...config, lastUpdateCheck: now, latestVersion: latest })
    }

    return isNewer(currentVersion, latest) ? latest : null
  } catch {
    return null
  }
}

export function formatUpdateNotice(current: string, latest: string): string {
  return [
    '',
    `  Update available: ${current} → ${latest}`,
    `  Run: npm install -g amulets-cli@latest`,
    '',
  ].join('\n')
}
