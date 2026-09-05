import { DEMO_PROFILES, DEMO_WORKOUT_LOGS } from '@/lib/admin-demo-data'
import { isAdminDemoMode } from '@/lib/admin-demo-server'
import {
  emptyMonthlySwimTotals,
  monthDateRange,
  type MonthlySwimTotals,
} from '@/lib/monthly-swim-stats-shared'
import { createClient } from '@/supabase/server'
import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

export type { MonthlySwimTotals } from '@/lib/monthly-swim-stats-shared'
export {
  defaultReviewMonthValue,
  formatAverageCheckIns,
  formatReviewMonthName,
  formatSwimCount,
  formatSwimMiles,
  monthDateRange,
  parseReviewMonth,
  previousReviewMonthValue,
  summarizeMonthlySwimStats,
} from '@/lib/monthly-swim-stats-shared'

export type MonthlySwimStats = {
  team: MonthlySwimTotals
  byUser: Map<string, MonthlySwimTotals>
}

type DbClient = SupabaseClient<Database>

/** Demo fixture distances keyed by workout_log.workoutId (yards). */
const DEMO_WORKOUT_DISTANCE: Record<number, number> = {
  101: 2800,
  102: 3200,
  103: 3000,
  104: 2500,
  105: 3100,
  106: 2900,
  107: 2700,
  108: 3300,
  109: 2400,
  110: 2600,
  111: 3000,
  112: 2800,
  113: 3100,
}

function addLogToMap(
  map: Map<string, MonthlySwimTotals>,
  userId: string,
  yards: number,
) {
  const entry = map.get(userId) ?? emptyMonthlySwimTotals()
  entry.checkIns += 1
  entry.yards += yards
  map.set(userId, entry)
}

function addAggrToMap(
  map: Map<string, MonthlySwimTotals>,
  userId: string,
  checkIns: number,
  yards: number,
) {
  const entry = map.get(userId) ?? emptyMonthlySwimTotals()
  entry.checkIns += checkIns
  entry.yards += yards
  map.set(userId, entry)
}

function aggregateDemoStats(
  isoMonth: string,
  userIds: string[],
): MonthlySwimStats {
  const userSet = new Set(userIds)
  const { start, endExclusive } = monthDateRange(isoMonth)
  const byUser = new Map<string, MonthlySwimTotals>()
  const team = emptyMonthlySwimTotals()

  for (const row of DEMO_WORKOUT_LOGS) {
    const uid = row.createdBy
    const date = row.date
    if (
      !uid ||
      !userSet.has(uid) ||
      !date ||
      date < start ||
      date >= endExclusive
    ) {
      continue
    }
    const yards =
      (row.workoutId != null ? DEMO_WORKOUT_DISTANCE[row.workoutId] : 0) ?? 0
    addLogToMap(byUser, uid, yards)
    team.checkIns += 1
    team.yards += yards
  }

  return { team, byUser }
}

type AggrDistanceRow = {
  userId: string
  distance: number
  count: number
}

/**
 * Monthly swim totals for a member cohort.
 * Keys in byUser are profile.userId (auth UUID).
 * Production reads pre-aggregated rows from `aggr_distance` (span=month).
 */
export async function getMonthlySwimStats(
  isoMonth: string,
  userIds: Array<string | null | undefined>,
  supabase: DbClient = createClient(),
): Promise<MonthlySwimStats> {
  const ids = [...new Set(userIds.filter((id): id is string => !!id))]
  if (ids.length === 0) {
    return { team: emptyMonthlySwimTotals(), byUser: new Map() }
  }

  if (isAdminDemoMode()) {
    return aggregateDemoStats(isoMonth, ids)
  }

  const { start } = monthDateRange(isoMonth)
  const aggrRows: AggrDistanceRow[] = []

  const pageSize = 1000
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('aggr_distance')
      .select('userId, distance, count')
      .eq('span', 'month')
      .eq('start', start)
      .in('userId', ids)
      .range(from, from + pageSize - 1)

    if (error) {
      console.error('monthly swim stats query failed', error.message)
      break
    }

    const rows = (data ?? []) as AggrDistanceRow[]
    aggrRows.push(...rows)

    if (rows.length < pageSize) break
    from += pageSize
  }

  const byUser = new Map<string, MonthlySwimTotals>()
  const team = emptyMonthlySwimTotals()

  for (const row of aggrRows) {
    const yards = Number(row.distance) || 0
    const checkIns = Number(row.count) || 0
    addAggrToMap(byUser, row.userId, checkIns, yards)
    team.checkIns += checkIns
    team.yards += yards
  }

  return { team, byUser }
}

/** All non-deactivated member auth UUIDs (RLS-scoped unless using service role). */
export async function getTeamMemberUserIds(
  supabase: DbClient = createClient(),
): Promise<string[]> {
  if (isAdminDemoMode()) {
    return DEMO_PROFILES.filter(
      (p) => p.status !== 'deactivated' && p.userId,
    ).map((p) => p.userId!)
  }

  const { data, error } = await supabase
    .from('profile')
    .select('userId')
    .neq('status', 'deactivated')
    .limit(5000)

  if (error) {
    console.error('profile userId query failed', error.message)
    return []
  }

  return (data ?? [])
    .map((row) => row.userId)
    .filter((id): id is string => !!id)
}
