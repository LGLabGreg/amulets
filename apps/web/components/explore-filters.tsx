'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const FORMATS = ['file', 'skill', 'bundle']

interface ExploreFiltersProps {
  defaultQ?: string
  defaultFormat?: string
}

export function ExploreFilters({ defaultQ, defaultFormat }: ExploreFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [q, setQ] = useState(defaultQ ?? '')

  useEffect(() => {
    setQ(defaultQ ?? '')
  }, [defaultQ])

  function buildParams(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const searchQ = overrides.q ?? q
    const format =
      overrides.format !== undefined ? overrides.format : (searchParams.get('format') ?? '')

    if (searchQ) params.set('q', searchQ)
    if (format) params.set('format', format)

    return params.toString()
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
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or description…"
          className="font-mono"
        />
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
