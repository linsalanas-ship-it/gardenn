import Link from 'next/link'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'
import LogoutButton from './LogoutButton'

function isLoggedIn() {
  const token = cookies().get('gardenn_admin')?.value
  const pw = process.env.ADMIN_PASSWORD ?? ''
  if (!pw || !token) return false
  return token === createHash('sha256').update(pw).digest('hex')
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = isLoggedIn()

  return (
    <div className="min-h-screen">
      {loggedIn && (
        <header className="border-b border-border">
          <div className="max-w-[1400px] mx-auto px-5 h-11 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/garden" className="text-sm font-semibold tracking-tight">
                Gardenn
              </Link>
              <span className="text-faint">|</span>
              <nav className="flex items-center gap-4">
                <Link href="/admin" className="text-xs text-muted hover:text-ink transition-colors uppercase tracking-wider">
                  Ideias
                </Link>
                <Link href="/admin/nova" className="text-xs text-muted hover:text-ink transition-colors uppercase tracking-wider">
                  + Nova
                </Link>
              </nav>
            </div>
            <LogoutButton />
          </div>
        </header>
      )}
      {children}
    </div>
  )
}
