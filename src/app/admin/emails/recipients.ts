import { createClient } from '@/supabase/server'
import type { Profile } from '@/types/database'

export type EmailAudience = 'all_members' | 'all_coaches' | 'individuals'

export type EmailRecipient = Pick<
  Profile,
  'id' | 'firstName' | 'lastName' | 'email' | 'userId' | 'role' | 'status'
>

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function resolveRecipients(
  audience: EmailAudience,
  memberIds: number[] | undefined,
): Promise<{ recipients: EmailRecipient[] } | { error: string }> {
  const supabase = createClient()

  let query = supabase
    .from('profile')
    .select('id, firstName, lastName, email, userId, role, status')
    .neq('status', 'deactivated')
    .order('lastName', { ascending: true })
    .order('firstName', { ascending: true })
    .limit(1000)

  if (audience === 'all_coaches') {
    query = query.eq('role', 'coach')
  } else if (audience === 'individuals') {
    const ids = [
      ...new Set((memberIds ?? []).filter((id) => Number.isFinite(id))),
    ]
    if (ids.length === 0) {
      return { error: 'Select at least one individual recipient.' }
    }
    query = query.in('id', ids)
  }

  const { data, error } = await query
  if (error) {
    return { error: error.message }
  }

  const recipients = (data ?? []).filter(
    (r) => r.email && isValidEmail(r.email.trim()),
  )

  if (recipients.length === 0) {
    return { error: 'No recipients with a valid email address matched.' }
  }

  return { recipients }
}
