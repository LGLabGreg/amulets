import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { refreshAccessToken } from './auth.js'

export interface Config {
  token: string
  refresh_token?: string
  expires_at?: number
  apiUrl?: string
}

export function getConfigPath(): string {
  return path.join(os.homedir(), '.config', 'amulets', 'config.json')
}

export function readConfig(): Config | null {
  const configPath = getConfigPath()
  if (!fs.existsSync(configPath)) return null
  try {
    const raw = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(raw) as Config
  } catch {
    return null
  }
}

export function writeConfig(config: Config): void {
  const configPath = getConfigPath()
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}

export function clearConfig(): void {
  const configPath = getConfigPath()
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath)
  }
}

export function getApiUrl(): string {
  const config = readConfig()
  return process.env.AMULETS_API_URL ?? config?.apiUrl ?? 'https://amulets.dev'
}

// Returns a valid access token, refreshing if it expires within 60 seconds.
export async function getValidToken(): Promise<string> {
  const config = readConfig()
  if (!config?.token) {
    console.error('Not logged in. Run `amulets login` first.')
    process.exit(1)
  }

  const expiresAt = config.expires_at ?? 0
  const needsRefresh = Date.now() >= expiresAt - 60_000

  if (needsRefresh && config.refresh_token) {
    try {
      const refreshed = await refreshAccessToken(config.refresh_token)
      const updated: Config = {
        ...config,
        token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: Date.now() + refreshed.expires_in * 1000,
      }
      writeConfig(updated)
      return updated.token
    } catch {
      // Refresh failed — fall through and try with existing token.
      // If it's truly expired the API will return 401 and the user can re-login.
    }
  }

  return config.token
}

export async function requireToken(): Promise<string> {
  const config = readConfig()
  if (!config?.token) {
    console.error('Not logged in. Run `amulets login` first.')
    process.exit(1)
  }
  return getValidToken()
}
