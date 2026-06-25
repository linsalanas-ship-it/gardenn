import { NextResponse, type NextRequest } from 'next/server'

async function expectedToken(): Promise<string | null> {
  const pw = process.env.ADMIN_PASSWORD ?? ''
  if (!pw) return null
  const encoded = new TextEncoder().encode(pw)
  const buf = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function middleware(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isLoginPage = request.nextUrl.pathname === '/admin/login'

  const token = request.cookies.get('gardenn_admin')?.value
  const expected = await expectedToken()
  const isAuthenticated = !!expected && token === expected

  if (isAdminRoute && !isLoginPage && !isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  if (isLoginPage && isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
