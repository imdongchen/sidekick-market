export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Role = 'coach' | 'swimmer' | 'admin'
export type Status = 'active' | 'deactivated' | 'pending' | 'invited'
export type TimeSpan = 'week' | 'month' | 'year' | 'max'

export type Profile = {
  id: number
  firstName: string
  lastName: string
  email: string
  slug: string
  avatar: string | null
  birthday: string | null
  usmsId: string | null
  role: Role | null
  status: Status
  teamId: number | null
  userId: string | null
  levelId: number | null
  poolAddressId: number | null
  createdAt: string
  updatedAt: string
}

export type Team = {
  id: number
  name: string
  slug: string
  city: string
  state: string
}

export type EmailTracking = {
  id: number
  emailId: string
  recipientEmail: string
  eventType: string
  timestamp: string
  metadata: Json | null
  userId: string | null
  year: string | null
  createdAt: string
}

/** Practice check-in / swim log entry (Sidekick iOS feed). */
export type WorkoutLog = {
  id: number
  teamId: number | null
  workoutId: number | null
  createdBy: string | null
  poolId: number | null
  date: string | null
  startTime: string | null
  endTime: string | null
  note: string | null
  photos: Json | null
  count: number | null
  createdAt: string
  updatedAt: string
}

/** Planned or logged workout (yardage lives here). */
export type Workout = {
  id: number
  teamId: number | null
  date: string | null
  distance: number | null
  count: number | null
  duration: number | null
  createdAt: string
}

/** Pre-aggregated swim distance / check-in counts by time span. */
export type AggrDistance = {
  id: number
  createdAt: string
  userId: string
  span: TimeSpan
  start: string
  end: string | null
  distance: number
  count: number
  teamId: number | null
  strokeDistances: Json
}

export type Database = {
  public: {
    Tables: {
      profile: {
        Row: Profile
        Insert: Partial<Profile> &
          Pick<Profile, 'firstName' | 'lastName' | 'email' | 'slug'>
        Update: Partial<Profile>
        Relationships: []
      }
      team: {
        Row: Team
        Insert: Partial<Team> & Pick<Team, 'name' | 'slug' | 'city' | 'state'>
        Update: Partial<Team>
        Relationships: []
      }
      email_tracking: {
        Row: EmailTracking
        Insert: Partial<EmailTracking> &
          Pick<EmailTracking, 'emailId' | 'recipientEmail' | 'eventType'>
        Update: Partial<EmailTracking>
        Relationships: []
      }
      workout_log: {
        Row: WorkoutLog
        Insert: Partial<WorkoutLog>
        Update: Partial<WorkoutLog>
        Relationships: []
      }
      workout: {
        Row: Workout
        Insert: Partial<Workout>
        Update: Partial<Workout>
        Relationships: []
      }
      aggr_distance: {
        Row: AggrDistance
        Insert: Partial<AggrDistance> &
          Pick<
            AggrDistance,
            'userId' | 'span' | 'start' | 'distance' | 'count' | 'strokeDistances'
          >
        Update: Partial<AggrDistance>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      Role: Role
      Status: Status
      TimeSpan: TimeSpan
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
