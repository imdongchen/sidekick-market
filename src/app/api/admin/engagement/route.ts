import { getSessionUser, isStaffRole } from '@/supabase/auth'
import { createClient } from '@/supabase/server'
import { getWeeklyUsageByDistinctIds } from '@/lib/posthog'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Body = {
  userIds?: string[]
}

/**
 * Returns weekly PostHog usage for the given auth user IDs.
 * POSTHOG_PERSONAL_API_KEY is read only here (and in @/lib/posthog) — never
 * commit it; set it in the host environment or `.env.local`.
 */
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profile')
    .select('role')
    .eq('userId', user.id)
    .maybeSingle()

  if (!profile || !isStaffRole(profile.role)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const userIds = [
    ...new Set(
      (body.userIds ?? []).filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
      ),
    ),
  ]

  if (userIds.length === 0) {
    return NextResponse.json({ usage: {} })
  }

  const usageMap = await getWeeklyUsageByDistinctIds(userIds)
  if (!usageMap) {
    return NextResponse.json(
      {
        usage: {},
        error: 'PostHog weekly usage unavailable.',
      },
      { status: 503 },
    )
  }

  const usage: Record<string, { weeklySessions: number; weeklyHours: number }> =
    {}
  for (const id of userIds) {
    const stats = usageMap.get(id)
    usage[id] = {
      weeklySessions: stats?.sessions ?? 0,
      weeklyHours: stats?.hours ?? 0,
    }
  }

  return NextResponse.json({ usage })
}
