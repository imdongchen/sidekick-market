import {
  DEMO_COOKIE_NAME,
  DEMO_SECRET_HEADER,
  isDemoAuthFrom,
} from '@/lib/admin-demo'
import { cookies, headers } from 'next/headers'

/** True when this request is a secret-gated non-production admin demo session. */
export function isAdminDemoMode(): boolean {
  try {
    return isDemoAuthFrom(
      cookies().get(DEMO_COOKIE_NAME)?.value,
      headers().get(DEMO_SECRET_HEADER),
    )
  } catch {
    return false
  }
}
