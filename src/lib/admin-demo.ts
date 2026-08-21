/**
 * Preview/local admin demo mode. Never enabled when VERCEL_ENV=production.
 * Requires ADMIN_DEMO_SECRET plus a matching cookie or header.
 */

export const DEMO_COOKIE_NAME = 'sk_admin_demo'
export const DEMO_SECRET_HEADER = 'x-admin-demo-secret'

export function isDemoModeAllowed(): boolean {
  if (process.env.VERCEL_ENV === 'production') return false
  if (
    process.env.VERCEL_ENV === 'preview' ||
    process.env.VERCEL_ENV === 'development'
  ) {
    return true
  }
  // Deny unknown Vercel environments; allow local / non-Vercel runtimes.
  if (process.env.VERCEL) return false
  return true
}

export function getConfiguredDemoSecret(): string | undefined {
  const secret = process.env.ADMIN_DEMO_SECRET?.trim()
  return secret || undefined
}

export function secretsEqual(
  provided: string | null | undefined,
  expected: string,
): boolean {
  if (!provided || provided.length !== expected.length) return false
  let mismatch = 0
  for (let i = 0; i < expected.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return mismatch === 0
}

export function isValidDemoSecret(
  provided: string | null | undefined,
): boolean {
  if (!isDemoModeAllowed()) return false
  const expected = getConfiguredDemoSecret()
  if (!expected) return false
  return secretsEqual(provided, expected)
}

export function isDemoAuthFrom(
  cookieValue: string | null | undefined,
  headerValue: string | null | undefined,
): boolean {
  return isValidDemoSecret(cookieValue) || isValidDemoSecret(headerValue)
}

export function demoCookieOptions(secure: boolean): {
  httpOnly: true
  sameSite: 'lax'
  secure: boolean
  path: '/'
  maxAge: number
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 60 * 12,
  }
}
