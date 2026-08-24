'use server'

import {
  type EmailAudience,
  resolveRecipients,
} from '@/app/admin/emails/recipients'
import { isAdminDemoMode } from '@/lib/admin-demo-server'
import { dispatchMonthlyReviewCampaign } from '@/lib/emails/send-monthly-review'
import {
  formatReviewMonthName,
  formatSwimMiles,
  getMonthlySwimStats,
  getTeamMemberUserIds,
  parseReviewMonth,
} from '@/lib/monthly-swim-stats'
import { requireStaff } from '@/supabase/auth'
import { createClient } from '@/supabase/server'
import { createServiceClient } from '@/supabase/service'
import { revalidatePath } from 'next/cache'

export type { EmailAudience }

export type SendMonthlyReviewInput = {
  audience: EmailAudience
  memberIds?: number[]
  /** YYYY-MM */
  month: string
  mode: 'now' | 'schedule'
  /** ISO 8601 datetime when mode is schedule */
  scheduledAt?: string
}

export type SendMonthlyReviewResult =
  | {
      success: true
      queued: number
      scheduled: boolean
      scheduledAt?: string
      emailIds: string[]
    }
  | { error: string }

export type MonthlyReviewStatsResult =
  | {
      teamCheckIns: number
      teamMiles: string
      monthName: string
    }
  | { error: string }

export async function fetchMonthlyReviewStats(
  month: string,
): Promise<MonthlyReviewStatsResult> {
  await requireStaff()

  const parsed = parseReviewMonth(month)
  if (!parsed) {
    return { error: 'Choose a valid month.' }
  }

  const supabase = createClient()
  const memberUserIds = await getTeamMemberUserIds(supabase)
  const stats = await getMonthlySwimStats(
    parsed.isoMonth,
    memberUserIds,
    supabase,
  )

  return {
    teamCheckIns: stats.team.checkIns,
    teamMiles: formatSwimMiles(stats.team.yards),
    monthName: formatReviewMonthName(parsed.isoMonth),
  }
}

export async function sendMonthlyReviewCampaign(
  input: SendMonthlyReviewInput,
): Promise<SendMonthlyReviewResult> {
  await requireStaff()

  const parsed = parseReviewMonth(input.month?.trim() ?? '')
  if (!parsed) {
    return { error: 'Choose a valid month before sending.' }
  }

  const supabase = createClient()

  if (isAdminDemoMode()) {
    const resolved = await resolveRecipients(
      input.audience,
      input.memberIds,
      supabase,
    )
    if ('error' in resolved) return { error: resolved.error }
    const scheduledAt =
      input.mode === 'schedule' ? input.scheduledAt : undefined
    return {
      success: true,
      queued: resolved.recipients.length,
      scheduled: input.mode === 'schedule',
      scheduledAt,
      emailIds: resolved.recipients.map(
        (recipient) => `demo-monthly-${recipient.id}-${Date.now()}`,
      ),
    }
  }

  const dispatchClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServiceClient()
    : supabase

  const result = await dispatchMonthlyReviewCampaign(dispatchClient, {
    ...input,
    source: 'admin',
    skipIfAlreadySent: false,
  })

  if ('error' in result) return { error: result.error }

  if (result.skipped) {
    return {
      error: result.reason ?? 'This monthly review was already sent.',
    }
  }

  revalidatePath('/admin/emails')
  revalidatePath('/admin')

  return {
    success: true,
    queued: result.queued,
    scheduled: result.scheduled,
    scheduledAt: result.scheduledAt,
    emailIds: result.emailIds,
  }
}
