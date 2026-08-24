import { DEMO_PROFILES, DEMO_WORKOUT_LOGS } from '@/lib/admin-demo-data'
import { isAdminDemoMode } from '@/lib/admin-demo-server'
import { yardsToMiles } from '@/utils/yard'
import { createClient } from '@/supabase/server'

export type MonthlySwimTotals = {
  checkIns: number
  yards: number
}

export type MonthlySwimStats = {
  team: MonthlySwimTotals
  byUser: Map<string, MonthlySwimTotals>
}

/** YYYY-MM for `<input type="month" />`. */
export function defaultReviewMonthValue(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function parseReviewMonth(isoMonth: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(isoMonth.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return { year, month, isoMonth: `${match[1]}-${match[2]}` }
}

export function formatReviewMonthName(isoMonth: string) {
  const parsed = parseReviewMonth(isoMonth)
  if (!parsed) return isoMonth
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
    new Date(parsed.year, parsed.month - 1, 1),
  )
}

export function monthDateRange(isoMonth: string) {
  const parsed = parseReviewMonth(isoMonth)
  if (!parsed) {
    throw new Error('Invalid month. Use YYYY-MM.')
  }
  const { year, month } = parsed
  const start = `${parsed.isoMonth}-01`
  const endExclusive =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`
  return { start, endExclusive }
}

export function formatSwimCount(count: number) {
  return count.toLocaleString('en-US')
}

export function formatSwimMiles(yards: number) {
  const miles = yardsToMiles(yards)
  if (miles >= 100) return miles.toFixed(0)
  if (miles >= 10) return miles.toFixed(1)
  if (miles >= 1) return miles.toFixed(1)
  return miles.toFixed(2)
}

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

function emptyTotals(): MonthlySwimTotals {
  return { checkIns: 0, yards: 0 }
}

function addToMap(
  map: Map<string, MonthlySwimTotals>,
  userId: string,
  yards: number,
) {
  const entry = map.get(userId) ?? emptyTotals()
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
  const team = emptyTotals()

  for (const row of DEMO_WORKOUT_LOGS) {
    const uid = row.createdBy
    const date = row.date
    if (!uid || !userSet.has(uid) || !date || date < start || date >= endExclusive) {
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
  workoutIds: number[],
): Promise<Map<number, number>> {
  const map = new Map<number, number>()
  const ids = [...new Set(workoutIds.filter((id) => Number.isFinite(id)))]
  if (ids.length === 0) return map

  const supabase = createClient()
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
      map.set(row.id as number, (row.distance as number | null) ?? 0)
    }
  }

  return map
}

/**
 * Monthly swim totals for a member cohort (typically all visible team members).
 * Keys in byUser are profile.userId (auth UUID).
 */
export async function getMonthlySwimStats(
  isoMonth: string,
  userIds: Array<string | null | undefined>,
): Promise<MonthlySwimStats> {
  const ids = [...new Set(userIds.filter((id): id is string => !!id))]
  if (ids.length === 0) {
    return { team: emptyTotals(), byUser: new Map() }
  }

  if (isAdminDemoMode()) {
    return aggregateDemoStats(isoMonth, ids)
  }

  const { start, endExclusive } = monthDateRange(isoMonth)
  const supabase = createClient()
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
    logRows.map((row) => row.workoutId).filter((id): id is number => id != null),
  )

  const byUser = new Map<string, MonthlySwimTotals>()
  const team = emptyTotals()

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

/** All non-deactivated member auth UUIDs visible to the current staff session. */
export async function getTeamMemberUserIds(): Promise<string[]> {
  if (isAdminDemoMode()) {
    return DEMO_PROFILES.filter((p) => p.status !== 'deactivated' && p.userId).map(
      (p) => p.userId!,
    )
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('profile')
    .select('userId')
    .neq('status', 'deactivated')
    .limit(1000)

  if (error) {
    console.error('profile userId query failed', error.message)
    return []
  }

  return (data ?? [])
    .map((row) => row.userId)
    .filter((id): id is string => !!id)
}
