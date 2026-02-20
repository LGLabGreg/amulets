import http from 'node:http'
import net from 'node:net'

export function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') {
        reject(new Error('Could not find free port'))
        return
      }
      const port = addr.port
      server.close(() => resolve(port))
    })
    server.on('error', reject)
  })
}

export interface CLIAuthResult {
  token: string
  refresh_token: string
  expires_in: number
}

/**
 * Starts a local HTTP server that waits for the web-app to redirect back
 * with tokens in the query string.
 */
export function waitForCLIAuthCallback(port: number): Promise<CLIAuthResult> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`)
      const token = url.searchParams.get('token')
      const refresh_token = url.searchParams.get('refresh_token') ?? ''
      const expires_in = Number(url.searchParams.get('expires_in') ?? '3600')
      const error = url.searchParams.get('error')

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end(
          '<html><body><h2>Login failed</h2><p>You can close this tab and return to the terminal.</p></body></html>',
        )
        server.close()
        reject(new Error(`Auth error: ${error}`))
        return
      }

      if (!token) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end(
          '<html><body><h2>Login failed</h2><p>No token received. You can close this tab.</p></body></html>',
        )
        server.close()
        reject(new Error('No token received'))
        return
      }

      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(
        '<html><body><h2>Login successful!</h2><p>You can close this tab and return to the terminal.</p></body></html>',
      )
      server.close()
      resolve({ token, refresh_token, expires_in })
    })

    server.listen(port, () => {})
    server.on('error', reject)
  })
}
