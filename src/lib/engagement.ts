import { createClient } from '@/supabase/server'

export type MemberEngagement = {
  checkIns: number
  monthlyCheckIns: number
  weeklySessions: number | null
  weeklyHours: number | null
}

export type WeeklyUsage = {
  weeklySessions: number
  weeklyHours: number
}

function startOfMonthISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

/**
 * Aggregate check-ins from workout_log.
 * Keys are profile.userId (auth UUID). Members without userId are omitted.
 * Weekly PostHog usage is loaded separately via /api/admin/engagement.
 */
export async function getCheckInEngagementByUserIds(
  userIds: Array<string | null | undefined>,
): Promise<Map<string, MemberEngagement>> {
  const map = new Map<string, MemberEngagement>()
  const ids = [...new Set(userIds.filter((id): id is string => !!id))]
  if (ids.length === 0) return map

  for (const id of ids) {
    map.set(id, {
      checkIns: 0,
      monthlyCheckIns: 0,
      weeklySessions: null,
      weeklyHours: null,
    })
  }

  const supabase = createClient()
  const monthStart = startOfMonthISO()

  const pageSize = 1000
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('workout_log')
      .select('createdBy, date')
      .in('createdBy', ids)
      .range(from, from + pageSize - 1)

    if (error) {
      console.error('workout_log engagement query failed', error.message)
      break
    }

    const rows = data ?? []
    for (const row of rows) {
      const uid = row.createdBy as string | null
      if (!uid || !map.has(uid)) continue
      const entry = map.get(uid)!
      entry.checkIns += 1
      const date = row.date as string | null
      if (date && date >= monthStart) {
        entry.monthlyCheckIns += 1
      }
    }

    if (rows.length < pageSize) break
    from += pageSize
  }

  return map
}

/** @deprecated Use getCheckInEngagementByUserIds */
export const getEngagementByUserIds = getCheckInEngagementByUserIds

export function emptyEngagement(): MemberEngagement {
  return {
    checkIns: 0,
    monthlyCheckIns: 0,
    weeklySessions: null,
    weeklyHours: null,
  }
}

export function engagementMapToRecord(
  map: Map<string, MemberEngagement>,
): Record<string, MemberEngagement> {
  return Object.fromEntries(map.entries())
}
