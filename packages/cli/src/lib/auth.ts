import crypto from 'node:crypto';
import http from 'node:http';
import net from 'node:net';

const SUPABASE_URL = process.env.AMULETS_SUPABASE_URL ?? '';

const SUPABASE_ANON_KEY = process.env.AMULETS_SUPABASE_ANON_KEY ?? '';

export function getSupabaseUrl(): string {
  if (!SUPABASE_URL) {
    console.error(
      'AMULETS_SUPABASE_URL environment variable is not set.\n' +
        'Set it to your Supabase project URL before running `amulets login`.',
    );
    process.exit(1);
  }
  return SUPABASE_URL;
}

export function getSupabaseAnonKey(): string {
  if (!SUPABASE_ANON_KEY) {
    console.error(
      'AMULETS_SUPABASE_ANON_KEY environment variable is not set.\n' +
        'Set it to your Supabase anon key before running `amulets login`.',
    );
    process.exit(1);
  }
  return SUPABASE_ANON_KEY;
}

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Could not find free port'));
        return;
      }
      const port = addr.port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

/**
 * Starts a local HTTP server that waits for the OAuth callback.
 * Returns the authorization code from the query string.
 */
export function waitForOAuthCallback(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`);

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(
            `<html><body><h2>Login failed</h2><p>${errorDescription ?? error}</p><p>You can close this tab.</p></body></html>`,
          );
          server.close();
          reject(new Error(`OAuth error: ${errorDescription ?? error}`));
          return;
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(
            '<html><body><h2>Login failed</h2><p>No code received.</p><p>You can close this tab.</p></body></html>',
          );
          server.close();
          reject(new Error('No authorization code received'));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          '<html><body><h2>Login successful!</h2><p>You can close this tab and return to the terminal.</p></body></html>',
        );
        server.close();
        resolve(code);
        return;
      }

      // Root page – not expected but handle gracefully
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    });

    server.listen(port, () => {});
    server.on('error', reject);
  });
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  const body = new URLSearchParams({
    auth_code: code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  });

  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      apikey: anonKey,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  return res.json() as Promise<TokenResponse>;
}

export async function getSupabaseUser(token: string): Promise<{
  id: string;
  email?: string;
  user_metadata: { user_name?: string; avatar_url?: string };
}> {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch user info');
  }

  return res.json() as Promise<{
    id: string;
    email?: string;
    user_metadata: { user_name?: string; avatar_url?: string };
  }>;
}
