'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ASSET_TYPES = ['prompt', 'skill', 'cursorrules', 'agents-md', 'other']
const FORMATS = ['file', 'package']

interface ExploreFiltersProps {
  defaultQ?: string
  defaultType?: string
  defaultFormat?: string
}

export function ExploreFilters({ defaultQ, defaultType, defaultFormat }: ExploreFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const searchRef = useRef<HTMLInputElement>(null)

  function buildParams(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const q = overrides.q ?? searchRef.current?.value ?? defaultQ
    const type = overrides.type !== undefined ? overrides.type : (searchParams.get('type') ?? '')
    const format =
      overrides.format !== undefined ? overrides.format : (searchParams.get('format') ?? '')

    if (q) params.set('q', q)
    if (type) params.set('type', type)
    if (format) params.set('format', format)

    return params.toString()
  }

  function onTypeChange(value: string | null) {
    startTransition(() => {
      const qs = buildParams({ type: !value || value === 'all' ? '' : value })
      router.push(`/explore${qs ? `?${qs}` : ''}`)
    })
  }

  function onFormatChange(value: string | null) {
    startTransition(() => {
      const qs = buildParams({ format: !value || value === 'all' ? '' : value })
      router.push(`/explore${qs ? `?${qs}` : ''}`)
    })
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    startTransition(() => {
      const qs = buildParams({})
      router.push(`/explore${qs ? `?${qs}` : ''}`)
    })
  }

  return (
    <form onSubmit={onSearch} className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Label className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Search
        </Label>
        <Input
          ref={searchRef}
          name="q"
          defaultValue={defaultQ ?? ''}
          placeholder="Search by name or description…"
          className="font-mono"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Type
        </Label>
        <Select value={defaultType ?? 'all'} onValueChange={onTypeChange}>
          <SelectTrigger className="font-mono">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ASSET_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Format
        </Label>
        <Select value={defaultFormat ?? 'all'} onValueChange={onFormatChange}>
          <SelectTrigger className="font-mono">
            <SelectValue placeholder="All formats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All formats</SelectItem>
            {FORMATS.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isPending}>
        Search
      </Button>
    </form>
  )
}
