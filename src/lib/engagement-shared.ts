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
