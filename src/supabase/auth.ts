import { redirect } from 'next/navigation'
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
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profile')
    .select('*')
    .eq('userId', user.id)
    .maybeSingle()

  if (!profile || !isStaffRole(profile.role)) return null
  return profile
}

/** Redirects to login if not authenticated as coach/admin. */
export async function requireStaff(): Promise<Profile> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin')

  const { data: profile } = await supabase
    .from('profile')
    .select('*')
    .eq('userId', user.id)
    .maybeSingle()

  if (!profile || !isStaffRole(profile.role)) {
    await supabase.auth.signOut()
    redirect('/login?error=unauthorized')
  }

  return profile
}
