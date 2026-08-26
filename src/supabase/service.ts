import type { Database } from '@/types/database'
import { createClient } from '@supabase/supabase-js'

/**
 * Privileged Supabase client for server jobs (cron) that must bypass RLS.
 * Requires SUPABASE_SERVICE_ROLE_KEY — never expose to the browser.
 */
export function createServiceClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_API_URL || process.env.SUPABASE_API_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_API_URL (or SUPABASE_API_URL).',
    )
  }
  if (!key) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Required for cron / privileged jobs.',
    )
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
