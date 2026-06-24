import { createHash } from 'crypto'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { password } = await request.json()
  const expected = process.env.ADMIN_PASSWORD ?? ''

  if (!expected || password !== expected) {
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })
  }

  const token = createHash('sha256').update(password).digest('hex')
  const response = NextResponse.json({ ok: true })
  response.cookies.set('gardenn_admin', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    path: '/',
  })
  return response
}
