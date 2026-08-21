import {
  DEMO_COOKIE_NAME,
  demoCookieOptions,
  getConfiguredDemoSecret,
  isDemoModeAllowed,
  isValidDemoSecret,
} from '@/lib/admin-demo'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//'))
    return '/admin'
  if (value.includes('\\') || value.includes('://')) return '/admin'
  return value
}

export async function GET(request: Request) {
  if (!isDemoModeAllowed() || !getConfiguredDemoSecret()) {
    return NextResponse.json(
      { ok: false, error: 'Not found.' },
      { status: 404 },
    )
  }

  const url = new URL(request.url)
  const secret =
    url.searchParams.get('secret') ?? request.headers.get('x-admin-demo-secret')

  if (!isValidDemoSecret(secret) || !secret) {
    return NextResponse.json(
      { ok: false, error: 'Invalid demo secret.' },
      { status: 401 },
    )
  }

  const next = safeNextPath(url.searchParams.get('next'))
  const response = NextResponse.redirect(new URL(next, url.origin))
  response.cookies.set(
    DEMO_COOKIE_NAME,
    secret,
    demoCookieOptions(process.env.VERCEL === '1' || url.protocol === 'https:'),
  )
  return response
}
