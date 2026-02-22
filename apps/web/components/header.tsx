import Link from 'next/link'
import { Suspense } from 'react'
import { HeaderAuth } from './header-auth'
import Logo from './logo'
import { ThemeToggle } from './theme-toggle'

export default function Header() {
  return (
    <header className="border-b bg-background fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link
          href="/"
          className="font-mono text-lg font-semibold tracking-tight flex items-center gap-2"
        >
          <Logo />
          amulets
        </Link>

        <nav className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Suspense fallback={<div className="h-8 w-36" />}>
            <HeaderAuth />
          </Suspense>
        </nav>
      </div>
    </header>
  )
}
