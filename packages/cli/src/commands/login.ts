import { execSync } from 'node:child_process'
import type { Command } from 'commander'
import ora from 'ora'
import { findFreePort, waitForCLIAuthCallback } from '../lib/auth.js'
import { getApiUrl, writeConfig } from '../lib/config.js'

function isWSL(): boolean {
  return !!process.env.WSL_DISTRO_NAME || !!process.env.WSLENV
}

function openBrowser(url: string): void {
  const platform = process.platform
  try {
    if (platform === 'darwin') {
      execSync(`open "${url}"`)
    } else if (platform === 'win32') {
      execSync(`start "" "${url}"`)
    } else if (isWSL()) {
      execSync(`cmd.exe /c start "" "${url}"`)
    } else {
      execSync(`xdg-open "${url}"`)
    }
  } catch {
    console.log(`\nCould not open browser automatically. Please visit:\n${url}\n`)
  }
}

export function registerLogin(program: Command): void {
  program
    .command('login')
    .description('Authenticate with GitHub via browser')
    .action(async () => {
      const apiUrl = getApiUrl()
      const port = await findFreePort()
      const callbackUrl = `http://localhost:${port}`
      const loginUrl = `${apiUrl}/cli-auth?callback=${encodeURIComponent(callbackUrl)}`

      console.log('Opening browser for GitHub authentication...')
      openBrowser(loginUrl)

      const spinner = ora('Waiting for authentication...').start()

      try {
        const result = await Promise.race([
          waitForCLIAuthCallback(port),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Login timed out after 5 minutes')), 5 * 60 * 1000),
          ),
        ])

        writeConfig({
          token: result.token,
          refresh_token: result.refresh_token,
          expires_at: Date.now() + result.expires_in * 1000,
        })
        spinner.succeed('Logged in successfully.')
      } catch (err) {
        spinner.fail(`Login failed: ${err instanceof Error ? err.message : String(err)}`)
        process.exit(1)
      }
    })
}
