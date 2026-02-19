import { execSync } from 'node:child_process'
import type { Command } from 'commander'
import ora from 'ora'
import {
  exchangeCodeForToken,
  findFreePort,
  generateCodeChallenge,
  generateCodeVerifier,
  getSupabaseAnonKey,
  getSupabaseUrl,
  waitForOAuthCallback,
} from '../lib/auth.js'
import { writeConfig } from '../lib/config.js'

function openBrowser(url: string): void {
  const platform = process.platform
  try {
    if (platform === 'darwin') {
      execSync(`open "${url}"`)
    } else if (platform === 'win32') {
      execSync(`start "" "${url}"`)
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
      const supabaseUrl = getSupabaseUrl()
      getSupabaseAnonKey() // validate early

      const port = await findFreePort()
      const redirectUri = `http://localhost:${port}/callback`
      const codeVerifier = generateCodeVerifier()
      const codeChallenge = generateCodeChallenge(codeVerifier)

      const oauthUrl =
        `${supabaseUrl}/auth/v1/authorize` +
        `?provider=github` +
        `&redirect_to=${encodeURIComponent(redirectUri)}` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256`

      console.log('Opening browser for GitHub authentication...')
      openBrowser(oauthUrl)

      const spinner = ora('Waiting for authentication...').start()

      try {
        const code = await Promise.race([
          waitForOAuthCallback(port),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Login timed out after 5 minutes')), 5 * 60 * 1000),
          ),
        ])

        spinner.text = 'Exchanging token...'
        const tokenResponse = await exchangeCodeForToken(code, codeVerifier, redirectUri)

        writeConfig({ token: tokenResponse.access_token })
        spinner.succeed('Logged in successfully.')
      } catch (err) {
        spinner.fail(`Login failed: ${err instanceof Error ? err.message : String(err)}`)
        process.exit(1)
      }
    })
}
