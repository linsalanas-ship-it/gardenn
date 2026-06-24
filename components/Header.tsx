'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')

  return (
    <header className="border-b border-border sticky top-0 bg-bg z-40">
      <div className="max-w-[1400px] mx-auto px-5 h-11 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Verball
        </Link>

        {!isAdmin && (
          <nav className="flex items-center gap-5">
            <span className="text-xs text-muted tracking-wide">
              arquivo de referências verbais
            </span>
          </nav>
        )}

        {isAdmin && (
          <span className="text-xs text-muted uppercase tracking-widest">Admin</span>
        )}
      </div>
    </header>
  )
}
