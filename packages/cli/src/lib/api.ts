import { getApiUrl } from './config.js'

export interface Asset {
  id: string
  name: string
  slug: string
  description: string | null
  asset_format: 'file' | 'package'
  type: string | null
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
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...fetchOptions } = options
  const apiUrl = getApiUrl()
  const url = `${apiUrl}${path}`

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  }
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
    type?: string
    tags?: string[]
    version: string
    message?: string
    content: string
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
): Promise<{ version: string; content?: string; download_url?: string; file_manifest?: unknown }> {
  return request(`/api/assets/${owner}/${name}/${version}`)
}

export async function getAssetVersions(
  owner: string,
  name: string,
): Promise<{
  versions: Array<{ id: string; version: string; message: string | null; created_at: string }>
}> {
  return request(`/api/assets/${owner}/${name}/versions`)
}

export async function searchAssets(
  q: string,
  filters: { type?: string; format?: string; tags?: string[] } = {},
): Promise<{ assets: Array<Asset & { users?: { username: string; avatar_url: string | null } }> }> {
  const params = new URLSearchParams({ q })
  if (filters.type) params.set('type', filters.type)
  if (filters.format) params.set('format', filters.format)
  for (const tag of filters.tags ?? []) params.append('tags', tag)
  return request(`/api/assets/search?${params.toString()}`)
}

export async function listMyAssets(token: string): Promise<{
  assets: Array<
    Asset & { asset_versions: Array<{ id: string; version: string; created_at: string }> }
  >
}> {
  return request('/api/me/assets', { token })
}
