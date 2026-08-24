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
  formatReviewMonthName,
  formatSwimCount,
  formatSwimMiles,
  monthDateRange,
  parseReviewMonth,
  previousReviewMonthValue,
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

function addToMap(
  map: Map<string, MonthlySwimTotals>,
  userId: string,
  yards: number,
) {
  const entry = map.get(userId) ?? emptyMonthlySwimTotals()
  entry.checkIns += 1
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
    addToMap(byUser, uid, yards)
    team.checkIns += 1
    team.yards += yards
  }

  return { team, byUser }
}

type WorkoutLogRow = {
  createdBy: string | null
  workoutId: number | null
}

async function fetchWorkoutDistances(
  supabase: DbClient,
  workoutIds: number[],
): Promise<Map<number, number>> {
  const map = new Map<number, number>()
  const ids = [...new Set(workoutIds.filter((id) => Number.isFinite(id)))]
  if (ids.length === 0) return map

  const pageSize = 200
  for (let i = 0; i < ids.length; i += pageSize) {
    const chunk = ids.slice(i, i + pageSize)
    const { data, error } = await supabase
      .from('workout')
      .select('id, distance')
      .in('id', chunk)

    if (error) {
      console.error('workout distance query failed', error.message)
      break
    }

    for (const row of data ?? []) {
      map.set(row.id, row.distance ?? 0)
    }
  }

  return map
}

/**
 * Monthly swim totals for a member cohort.
 * Keys in byUser are profile.userId (auth UUID).
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

  const { start, endExclusive } = monthDateRange(isoMonth)
  const logRows: WorkoutLogRow[] = []

  const pageSize = 1000
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('workout_log')
      .select('createdBy, workoutId')
      .in('createdBy', ids)
      .gte('date', start)
      .lt('date', endExclusive)
      .range(from, from + pageSize - 1)

    if (error) {
      console.error('monthly swim stats query failed', error.message)
      break
    }

    const rows = (data ?? []) as WorkoutLogRow[]
    logRows.push(...rows)

    if (rows.length < pageSize) break
    from += pageSize
  }

  const distances = await fetchWorkoutDistances(
    supabase,
    logRows
      .map((row) => row.workoutId)
      .filter((id): id is number => id != null),
  )

  const byUser = new Map<string, MonthlySwimTotals>()
  const team = emptyMonthlySwimTotals()

  for (const row of logRows) {
    const uid = row.createdBy
    if (!uid) continue
    const yards =
      row.workoutId != null ? (distances.get(row.workoutId) ?? 0) : 0
    addToMap(byUser, uid, yards)
    team.checkIns += 1
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
