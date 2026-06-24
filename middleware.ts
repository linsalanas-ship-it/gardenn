import { createHash } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'

function expectedToken() {
  const pw = process.env.ADMIN_PASSWORD ?? ''
  if (!pw) return null
  return createHash('sha256').update(pw).digest('hex')
}

export function middleware(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isLoginPage = request.nextUrl.pathname === '/admin/login'

  const token = request.cookies.get('gardenn_admin')?.value
  const expected = expectedToken()
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
