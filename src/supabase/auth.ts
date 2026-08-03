import { redirect } from 'next/navigation'
import { createAdminClient } from '@/supabase/admin'
import { createClient } from '@/supabase/server'
import type { Profile, Role } from '@/types/database'

const STAFF_ROLES: Role[] = ['coach', 'admin']

export function isStaffRole(role: Role | null | undefined): boolean {
  return !!role && STAFF_ROLES.includes(role)
}

export async function getSessionUser() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getStaffProfile(): Promise<Profile | null> {
  const user = await getSessionUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profile')
    .select('*')
    .eq('userId', user.id)
    .maybeSingle()

  if (!profile || !isStaffRole(profile.role)) return null
  return profile
}

/** Redirects to login if not authenticated as coach/admin. */
export async function requireStaff(): Promise<Profile> {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/admin')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profile')
    .select('*')
    .eq('userId', user.id)
    .maybeSingle()

  if (!profile || !isStaffRole(profile.role)) {
    const supabase = createClient()
    await supabase.auth.signOut()
    redirect('/login?error=unauthorized')
  }

  return profile
}
