import { createClient } from '@supabase/supabase-js'

// Support both NEXT_PUBLIC_ prefixed (for client-side) and non-prefixed (for server-side) env vars
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_API_URL || process.env.SUPABASE_API_URL || ''
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''

if (!supabaseUrl) {
  throw new Error(
    'Missing environment variable: SUPABASE_API_URL or NEXT_PUBLIC_SUPABASE_API_URL',
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing environment variable: SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
