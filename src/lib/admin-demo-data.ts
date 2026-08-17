import type { EmailTracking, Profile, Team, WorkoutLog } from '@/types/database'

export type DemoResendTemplate = {
  id: string
  name: string
  alias: string | null
  status: 'draft' | 'published'
  publishedAt: string | null
  updatedAt: string
  createdAt: string
}

export const DEMO_STAFF_USER_ID = '00000000-0000-4000-a000-000000000001'

const now = new Date()

function isoDaysAgo(days: number, hours = 12): string {
  const d = new Date(now)
  d.setDate(d.getDate() - days)
  d.setHours(hours, 0, 0, 0)
  return d.toISOString()
}

function dateDaysAgo(days: number): string {
  return isoDaysAgo(days).slice(0, 10)
}

function monthStartDate(): string {
  const d = new Date(now.getFullYear(), now.getMonth(), 1)
  return d.toISOString().slice(0, 10)
}

const created = isoDaysAgo(400)
const updated = isoDaysAgo(2)

export const DEMO_STAFF_PROFILE: Profile = {
  id: 1,
  firstName: 'Avery',
  lastName: 'Coach',
  email: 'avery@sidekickswim.com',
  slug: 'avery-coach',
  avatar: null,
  birthday: '1988-04-12',
  usmsId: '1A8COACH',
  role: 'admin',
  status: 'active',
  teamId: 1,
  userId: DEMO_STAFF_USER_ID,
  levelId: 3,
  poolAddressId: null,
  createdAt: created,
  updatedAt: updated,
}

export const DEMO_TEAMS: Team[] = [
  {
    id: 1,
    name: 'Sidekick Masters',
    slug: 'sidekick-masters',
    city: 'Oakland',
    state: 'CA',
  },
  {
    id: 2,
    name: 'Bay Current',
    slug: 'bay-current',
    city: 'San Francisco',
    state: 'CA',
  },
]

export const DEMO_PROFILES: Profile[] = [
  DEMO_STAFF_PROFILE,
  {
    id: 2,
    firstName: 'Jordan',
    lastName: 'Lane',
    email: 'jordan.lane@example.com',
    slug: 'jordan-lane',
    avatar: null,
    birthday: '1992-09-03',
    usmsId: '1JLANE92',
    role: 'coach',
    status: 'active',
    teamId: 1,
    userId: '00000000-0000-4000-a000-000000000002',
    levelId: 3,
    poolAddressId: null,
    createdAt: isoDaysAgo(360),
    updatedAt: isoDaysAgo(8),
  },
  {
    id: 3,
    firstName: 'Sam',
    lastName: 'Rivera',
    email: 'sam.rivera@example.com',
    slug: 'sam-rivera',
    avatar: null,
    birthday: '1996-01-22',
    usmsId: '1SRIVERA',
    role: 'swimmer',
    status: 'active',
    teamId: 1,
    userId: '00000000-0000-4000-a000-000000000003',
    levelId: 2,
    poolAddressId: null,
    createdAt: isoDaysAgo(200),
    updatedAt: isoDaysAgo(1),
  },
  {
    id: 4,
    firstName: 'Riley',
    lastName: 'Chen',
    email: 'riley.chen@example.com',
    slug: 'riley-chen',
    avatar: null,
    birthday: '2001-07-15',
    usmsId: '1RCHEN01',
    role: 'swimmer',
    status: 'pending',
    teamId: 1,
    userId: '00000000-0000-4000-a000-000000000004',
    levelId: 1,
    poolAddressId: null,
    createdAt: isoDaysAgo(12),
    updatedAt: isoDaysAgo(12),
  },
  {
    id: 5,
    firstName: 'Casey',
    lastName: 'Nguyen',
    email: 'casey.nguyen@example.com',
    slug: 'casey-nguyen',
    avatar: null,
    birthday: '1984-11-30',
    usmsId: '1CNGUYEN',
    role: 'swimmer',
    status: 'invited',
    teamId: 2,
    userId: '00000000-0000-4000-a000-000000000005',
    levelId: 2,
    poolAddressId: null,
    createdAt: isoDaysAgo(20),
    updatedAt: isoDaysAgo(20),
  },
  {
    id: 6,
    firstName: 'Morgan',
    lastName: 'Blake',
    email: 'morgan.blake@example.com',
    slug: 'morgan-blake',
    avatar: null,
    birthday: '1979-02-08',
    usmsId: null,
    role: 'swimmer',
    status: 'deactivated',
    teamId: 2,
    userId: '00000000-0000-4000-a000-000000000006',
    levelId: null,
    poolAddressId: null,
    createdAt: isoDaysAgo(500),
    updatedAt: isoDaysAgo(40),
  },
  {
    id: 7,
    firstName: 'Quinn',
    lastName: 'Patel',
    email: 'quinn.patel@example.com',
    slug: 'quinn-patel',
    avatar: null,
    birthday: '1990-06-18',
    usmsId: '1QPATEL',
    role: 'swimmer',
    status: 'active',
    teamId: 2,
    userId: null,
    levelId: 2,
    poolAddressId: null,
    createdAt: isoDaysAgo(90),
    updatedAt: isoDaysAgo(14),
  },
  {
    id: 8,
    firstName: 'Taylor',
    lastName: 'Kim',
    email: 'taylor.kim@example.com',
    slug: 'taylor-kim',
    avatar: null,
    birthday: '1994-12-01',
    usmsId: '1TKIM94',
    role: 'coach',
    status: 'active',
    teamId: 2,
    userId: '00000000-0000-4000-a000-000000000008',
    levelId: 3,
    poolAddressId: null,
    createdAt: isoDaysAgo(280),
    updatedAt: isoDaysAgo(3),
  },
]

function tracking(
  id: number,
  emailId: string,
  recipientEmail: string,
  eventType: string,
  daysAgo: number,
  userId: string | null,
  extra?: Partial<EmailTracking>,
): EmailTracking {
  const timestamp = isoDaysAgo(daysAgo, 9 + (id % 8))
  return {
    id,
    emailId,
    recipientEmail,
    eventType,
    timestamp,
    metadata: { campaign: 'reintroduce-sidekick', demo: true },
    userId,
    year: '2026',
    createdAt: timestamp,
    ...extra,
  }
}

export const DEMO_EMAIL_TRACKING: EmailTracking[] = [
  tracking(
    1,
    'demo_reintro_sam',
    'sam.rivera@example.com',
    'email.sent',
    5,
    '00000000-0000-4000-a000-000000000003',
  ),
  tracking(
    2,
    'demo_reintro_sam',
    'sam.rivera@example.com',
    'email.delivered',
    5,
    '00000000-0000-4000-a000-000000000003',
  ),
  tracking(
    3,
    'demo_reintro_sam',
    'sam.rivera@example.com',
    'email.opened',
    4,
    '00000000-0000-4000-a000-000000000003',
  ),
  tracking(
    4,
    'demo_reintro_jordan',
    'jordan.lane@example.com',
    'email.sent',
    5,
    '00000000-0000-4000-a000-000000000002',
  ),
  tracking(
    5,
    'demo_reintro_jordan',
    'jordan.lane@example.com',
    'email.delivered',
    4,
    '00000000-0000-4000-a000-000000000002',
  ),
  tracking(
    6,
    'demo_reintro_jordan',
    'jordan.lane@example.com',
    'email.clicked',
    3,
    '00000000-0000-4000-a000-000000000002',
  ),
  tracking(
    7,
    'demo_meet_taylor',
    'taylor.kim@example.com',
    'email.scheduled',
    1,
    '00000000-0000-4000-a000-000000000008',
    { year: null },
  ),
  tracking(
    8,
    'demo_reintro_casey',
    'casey.nguyen@example.com',
    'email.bounced',
    6,
    '00000000-0000-4000-a000-000000000005',
  ),
]

function workout(
  id: number,
  createdBy: string,
  daysAgo: number,
  teamId: number,
): WorkoutLog {
  const date = dateDaysAgo(daysAgo)
  return {
    id,
    teamId,
    workoutId: 100 + id,
    createdBy,
    poolId: 1,
    date,
    startTime: `${date}T06:30:00.000Z`,
    endTime: `${date}T08:00:00.000Z`,
    note: null,
    photos: null,
    count: 1,
    createdAt: isoDaysAgo(daysAgo, 8),
    updatedAt: isoDaysAgo(daysAgo, 8),
  }
}

const sam = '00000000-0000-4000-a000-000000000003'
const jordan = '00000000-0000-4000-a000-000000000002'
const taylor = '00000000-0000-4000-a000-000000000008'
const avery = DEMO_STAFF_USER_ID

export const DEMO_WORKOUT_LOGS: WorkoutLog[] = [
  workout(1, sam, 2, 1),
  workout(2, sam, 4, 1),
  workout(3, sam, 9, 1),
  workout(4, sam, 18, 1),
  workout(5, sam, 33, 1),
  workout(6, jordan, 1, 1),
  workout(7, jordan, 3, 1),
  workout(8, jordan, 10, 1),
  workout(9, taylor, 6, 2),
  workout(10, taylor, 20, 2),
  workout(11, avery, 0, 1),
  workout(12, avery, 7, 1),
  // Guarantee at least one check-in in the current month even near month start.
  {
    ...workout(13, sam, 0, 1),
    date: monthStartDate() < dateDaysAgo(0) ? dateDaysAgo(0) : monthStartDate(),
  },
]

export const DEMO_WEEKLY_USAGE: Record<
  string,
  { weeklySessions: number; weeklyHours: number }
> = {
  [DEMO_STAFF_USER_ID]: { weeklySessions: 4, weeklyHours: 5.5 },
  [jordan]: { weeklySessions: 3, weeklyHours: 4.0 },
  [sam]: { weeklySessions: 5, weeklyHours: 6.25 },
  [taylor]: { weeklySessions: 2, weeklyHours: 2.5 },
  '00000000-0000-4000-a000-000000000004': {
    weeklySessions: 0,
    weeklyHours: 0,
  },
}

export const DEMO_RESEND_TEMPLATES: DemoResendTemplate[] = [
  {
    id: 'tmpl_demo_practice',
    name: 'Practice reminder',
    alias: 'practice-reminder',
    status: 'published',
    publishedAt: isoDaysAgo(10),
    updatedAt: isoDaysAgo(2),
    createdAt: isoDaysAgo(30),
  },
  {
    id: 'tmpl_demo_meet',
    name: 'Meet recap',
    alias: 'meet-recap',
    status: 'draft',
    publishedAt: null,
    updatedAt: isoDaysAgo(1),
    createdAt: isoDaysAgo(6),
  },
]

export const DEMO_AUTH_USER = {
  id: DEMO_STAFF_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: DEMO_STAFF_PROFILE.email,
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {
    firstName: DEMO_STAFF_PROFILE.firstName,
    lastName: DEMO_STAFF_PROFILE.lastName,
  },
  created_at: created,
}
