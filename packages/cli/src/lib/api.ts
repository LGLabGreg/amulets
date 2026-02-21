import { getApiUrl } from './config.js'

export interface Asset {
  id: string
  name: string
  slug: string
  description: string | null
  asset_format: 'file' | 'skill' | 'bundle'
  tags: string[]
  is_public: boolean
  created_at: string
}

export interface AssetVersion {
  id: string
  asset_id: string
  version: string
  message: string | null
  created_at: string
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string; headers?: Record<string, string> } = {},
): Promise<T> {
  const { token, headers: extraHeaders, ...fetchOptions } = options
  const apiUrl = getApiUrl()
  const url = `${apiUrl}${path}`

  const headers: Record<string, string> = { ...extraHeaders }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { ...fetchOptions, headers })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message)
  }

  return res.json() as Promise<T>
}

export async function pushSimpleAsset(
  token: string,
  payload: {
    name: string
    slug: string
    description?: string
    tags?: string[]
    version: string
    message?: string
    content: string
    is_public?: boolean
  },
): Promise<{ asset: Asset; version: AssetVersion }> {
  return request('/api/assets', {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function pushPackageAsset(
  token: string,
  formData: FormData,
): Promise<{ asset: Asset; version: AssetVersion }> {
  return request('/api/assets', {
    method: 'POST',
    token,
    body: formData,
  })
}

export async function getAssetVersion(
  owner: string,
  name: string,
  version: string,
  token: string,
  extraHeaders?: Record<string, string>,
): Promise<{
  version: string
  content?: string
  download_url?: string
  file_manifest?: unknown
  message?: string
  created_at?: string
  asset_format?: string
  review_url?: string
}> {
  return request(`/api/assets/${owner}/${name}/${version}`, {
    token,
    headers: extraHeaders,
  })
}

export async function getAssetVersions(
  owner: string,
  name: string,
  token: string,
): Promise<{
  versions: Array<{ id: string; version: string; message: string | null; created_at: string }>
}> {
  return request(`/api/assets/${owner}/${name}/versions`, { token })
}

export async function getMe(token: string): Promise<{ username: string | null; id: string }> {
  return request('/api/auth/me', { token })
}

export async function listMyAssets(token: string): Promise<{
  assets: Array<
    Asset & { asset_versions: Array<{ id: string; version: string; created_at: string }> }
  >
}> {
  return request('/api/me/assets', { token })
}
