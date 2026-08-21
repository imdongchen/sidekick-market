import { isAdminDemoMode } from '@/lib/admin-demo-server'
import { createDemoClient } from '@/supabase/demo-client'
import type { Database } from '@/types/database'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  if (isAdminDemoMode()) {
    return createDemoClient() as unknown as ReturnType<
      typeof createServerClient<Database>
    >
  }

  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_API_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component — middleware will refresh the session.
          }
        },
      },
    },
  )
}
