import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './LogoutButton'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginPage = !user

  return (
    <div className="min-h-screen">
      {!isLoginPage && (
        <header className="border-b border-border">
          <div className="max-w-[1400px] mx-auto px-5 h-11 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/garden" className="text-sm font-semibold tracking-tight">
                Gardenn
              </Link>
              <span className="text-faint">|</span>
              <nav className="flex items-center gap-4">
                <Link
                  href="/admin"
                  className="text-xs text-muted hover:text-ink transition-colors uppercase tracking-wider"
                >
                  Ideias
                </Link>
                <Link
                  href="/admin/nova"
                  className="text-xs text-muted hover:text-ink transition-colors uppercase tracking-wider"
                >
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
