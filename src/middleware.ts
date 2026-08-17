import {
  DEMO_COOKIE_NAME,
  DEMO_SECRET_HEADER,
  demoCookieOptions,
  isDemoAuthFrom,
  isValidDemoSecret,
} from '@/lib/admin-demo'
import { updateSession } from '@/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const cookieValue = request.cookies.get(DEMO_COOKIE_NAME)?.value
  const headerValue = request.headers.get(DEMO_SECRET_HEADER)

  if (isDemoAuthFrom(cookieValue, headerValue)) {
    const response = NextResponse.next({ request })
    if (!cookieValue && isValidDemoSecret(headerValue) && headerValue) {
      response.cookies.set(
        DEMO_COOKIE_NAME,
        headerValue,
        demoCookieOptions(process.env.VERCEL === '1'),
      )
    }
    return response
  }

  return updateSession(request)
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
}
