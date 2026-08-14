import { createClient } from '@/supabase/server'
import {
  getWeeklyUsageByDistinctIds,
  isPostHogConfigured,
} from '@/lib/posthog'

export type MemberEngagement = {
  checkIns: number
  monthlyCheckIns: number
  weeklySessions: number | null
  weeklyHours: number | null
}

function startOfMonthISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

/**
 * Aggregate check-ins (workout_log) and PostHog weekly usage for members.
 * Keys are profile.userId (auth UUID). Members without userId are omitted.
 */
export async function getEngagementByUserIds(
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

  // Paginate — PostgREST default max is often 1000 rows.
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

  if (isPostHogConfigured()) {
    const usage = await getWeeklyUsageByDistinctIds(ids)
    for (const [uid, stats] of usage) {
      const entry = map.get(uid)
      if (!entry) continue
      entry.weeklySessions = stats.sessions
      entry.weeklyHours = stats.hours
    }
    // Distinct ids with no sessions in the window still count as 0.
    for (const id of ids) {
      const entry = map.get(id)!
      if (entry.weeklySessions === null) {
        entry.weeklySessions = 0
        entry.weeklyHours = 0
      }
    }
  }

  return map
}

export function emptyEngagement(): MemberEngagement {
  return {
    checkIns: 0,
    monthlyCheckIns: 0,
    weeklySessions: null,
    weeklyHours: null,
  }
}
