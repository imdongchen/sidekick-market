'use client'

import { MemberEngagementStats } from '@/components/admin/member-engagement-stats'
import type { MemberEngagement } from '@/lib/engagement-shared'
import { useEffect, useState, type ReactNode } from 'react'

type Usage = { weeklySessions: number; weeklyHours: number }

/**
 * Loads weekly PostHog usage from /api/admin/engagement (where
 * POSTHOG_PERSONAL_API_KEY is read server-side) and merges it into check-in
 * engagement from the server.
 */
export function MemberEngagementWithUsage({
  userId,
  checkIns,
  monthlyCheckIns,
  compact = false,
}: {
  userId: string | null
  checkIns: number
  monthlyCheckIns: number
  compact?: boolean
}) {
  const [usage, setUsage] = useState<Usage | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('/api/admin/engagement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: [userId] }),
        })
        if (!res.ok) {
          if (!cancelled) setFailed(true)
          return
        }
        const data = (await res.json()) as {
          usage?: Record<string, Usage>
        }
        const row = data.usage?.[userId]
        if (!cancelled) {
          setUsage(
            row ?? {
              weeklySessions: 0,
              weeklyHours: 0,
            },
          )
        }
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId])

  const engagement: MemberEngagement = {
    checkIns,
    monthlyCheckIns,
    weeklySessions: failed ? null : (usage?.weeklySessions ?? null),
    weeklyHours: failed ? null : (usage?.weeklyHours ?? null),
  }

  return <MemberEngagementStats engagement={engagement} compact={compact} />
}

/**
 * Batch-loads weekly usage for a members table. Children render function receives
 * a lookup map keyed by userId.
 */
export function MemberWeeklyUsageProvider({
  userIds,
  children,
}: {
  userIds: string[]
  children: (usageByUser: Map<string, Usage>, ready: boolean) => ReactNode
}) {
  const [usageByUser, setUsageByUser] = useState<Map<string, Usage>>(new Map())
  const [ready, setReady] = useState(false)
  const userIdsKey = userIds.join(',')

  useEffect(() => {
    const ids = userIdsKey ? [...new Set(userIdsKey.split(',').filter(Boolean))] : []
    if (ids.length === 0) {
      setReady(true)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/engagement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: ids }),
        })
        if (!res.ok) {
          if (!cancelled) setReady(true)
          return
        }
        const data = (await res.json()) as {
          usage?: Record<string, Usage>
        }
        const map = new Map<string, Usage>()
        for (const id of ids) {
          const row = data.usage?.[id]
          map.set(id, {
            weeklySessions: row?.weeklySessions ?? 0,
            weeklyHours: row?.weeklyHours ?? 0,
          })
        }
        if (!cancelled) {
          setUsageByUser(map)
          setReady(true)
        }
      } catch {
        if (!cancelled) setReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userIdsKey])

  return <>{children(usageByUser, ready)}</>
}
