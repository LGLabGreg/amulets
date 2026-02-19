import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 text-xs text-muted-foreground">
        <span>
          <Link href="/" className="font-mono font-semibold">
            amulet
          </Link>{' '}
          — npm for AI workflow files
        </span>
        <div className="flex gap-4">
          <Link href="/explore" className="hover:text-foreground">
            Explore
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
