export type ReviewType = 'individual' | 'team'

export interface TimedSwim {
  userId: string
  stroke: string // e.g., 'freestyle', 'backstroke', 'breaststroke', 'butterfly'
  distance: number // in meters or yards
  time: number // in seconds
  isPR: boolean // personal record flag
  date?: string // YYYY-MM-DD (optional, for date tracking)
}

export interface SwimmerData {
  id: string
  slug: string
  name: string
  photo?: string
  distance: number // in meters or yards
  count: number
  longestStreak: {
    start: string // YYYY-MM-DD
    end: string // YYYY-MM-DD
    count: number
  }
  timedSwims?: TimedSwim[] // timed swims with PRs
  dailyData: {
    date: string // YYYY-MM-DD
    distance: number
    count: number
  }[]
  weeklyData: {
    start: string // YYYY-MM-DD
    end: string // YYYY-MM-DD
    distance: number
    count: number
  }[]
  monthlyData: {
    start: string // YYYY-MM-DD
    distance: number
    count: number
  }[]
}

export interface TeamData {
  year: number
  swimmers: SwimmerData[]
  totalTeamDistance: number
  totalTeamCount: number
}

export interface PersonalRecord {
  id: string
  type:
    | 'first_swim'
    | 'longest_distance'
    | 'most_swims_week'
    | 'most_swims_month'
    | 'longest_streak'
    | 'best_month'
    | 'timed_swim_pr'
  label: string
  value: string
  date: string
  description?: string
  stroke?: string // for timed swim PRs
  distance?: number // for timed swim PRs
  time?: number // for timed swim PRs (in seconds)
}

export interface ReviewData {
  type: ReviewType
  year: number
  swimmer?: SwimmerData
  swimmers?: SwimmerData[]
  team?: TeamData
  personalRecords?: PersonalRecord[]
}
