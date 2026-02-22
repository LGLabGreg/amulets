import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 text-xs text-muted-foreground">
        <Link href="/" className="font-mono font-semibold">
          amulets
        </Link>
        <div className="flex gap-4">
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
          <a
            href="https://github.com/LGLabGreg/amulets"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}
