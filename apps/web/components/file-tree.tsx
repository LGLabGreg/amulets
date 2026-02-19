interface FileEntry {
  path: string
  size: number
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

interface FileTreeProps {
  manifest: FileEntry[]
}

export function FileTree({ manifest }: FileTreeProps) {
  const sorted = [...manifest].sort((a, b) => a.path.localeCompare(b.path))

  // Group by directory prefix
  const dirs = new Set<string>()
  for (const f of sorted) {
    const parts = f.path.split('/')
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join('/'))
    }
  }

  return (
    <div className="font-mono text-xs border border-border">
      <div className="border-b border-border bg-muted/50 px-3 py-2 text-muted-foreground">
        {manifest.length} file{manifest.length !== 1 ? 's' : ''}
      </div>
      <ul>
        {sorted.map((entry, i) => {
          const depth = entry.path.split('/').length - 1
          const parts = entry.path.split('/')
          const name = parts[parts.length - 1] ?? entry.path
          const isLast = i === sorted.length - 1
          return (
            <li
              key={entry.path}
              className={`flex items-center justify-between px-3 py-1.5 ${!isLast ? 'border-b border-border' : ''} hover:bg-muted/30`}
            >
              <span
                style={{ paddingLeft: `${depth * 16}px` }}
                className="flex items-center gap-1.5 text-foreground"
              >
                <span className="text-muted-foreground select-none">{depth > 0 ? '└─ ' : ''}</span>
                {name}
              </span>
              <span className="text-muted-foreground shrink-0 ml-4">{formatSize(entry.size)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
