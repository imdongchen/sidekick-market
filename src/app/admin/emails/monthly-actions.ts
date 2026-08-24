'use server'

import {
  type EmailAudience,
  resolveRecipients,
} from '@/app/admin/emails/recipients'
import { isAdminDemoMode } from '@/lib/admin-demo-server'
import {
  formatReviewMonthName,
  formatSwimCount,
  formatSwimMiles,
  getMonthlySwimStats,
  getTeamMemberUserIds,
  parseReviewMonth,
} from '@/lib/monthly-swim-stats'
import {
  MONTHLY_REVIEW_CAMPAIGN,
  monthlyReviewSubject,
  personalizeMonthlyReviewEmail,
} from '@/lib/emails/monthly-swim-review'
import { loadMonthlyReviewHtml } from '@/lib/emails/monthly-swim-review.server'
import { getResendClient, getResendFrom, getResendReplyTo } from '@/lib/resend'
import { requireStaff } from '@/supabase/auth'
import { createClient } from '@/supabase/server'
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

const BATCH_SIZE = 100

export async function fetchMonthlyReviewStats(
  month: string,
): Promise<MonthlyReviewStatsResult> {
  await requireStaff()

  const parsed = parseReviewMonth(month)
  if (!parsed) {
    return { error: 'Choose a valid month.' }
  }

  const memberUserIds = await getTeamMemberUserIds()
  const stats = await getMonthlySwimStats(parsed.isoMonth, memberUserIds)

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

  const monthName = formatReviewMonthName(parsed.isoMonth)

  if (isAdminDemoMode()) {
    const resolved = await resolveRecipients(input.audience, input.memberIds)
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

  if (!process.env.RESEND_API_KEY) {
    return {
      error:
        'RESEND_API_KEY is not configured on the server. Add it to your environment and try again.',
    }
  }

  let scheduledAt: string | undefined
  if (input.mode === 'schedule') {
    if (!input.scheduledAt) {
      return { error: 'Choose a date and time to schedule this send.' }
    }
    const when = new Date(input.scheduledAt)
    if (Number.isNaN(when.getTime())) {
      return { error: 'Invalid schedule time.' }
    }
    if (when.getTime() <= Date.now() + 60_000) {
      return {
        error: 'Schedule time must be at least one minute in the future.',
      }
    }
    scheduledAt = when.toISOString()
  }

  const resolved = await resolveRecipients(input.audience, input.memberIds)
  if ('error' in resolved) {
    return { error: resolved.error }
  }

  const memberUserIds = await getTeamMemberUserIds()
  const stats = await getMonthlySwimStats(parsed.isoMonth, memberUserIds)
  const teamCheckIns = formatSwimCount(stats.team.checkIns)
  const teamMiles = formatSwimMiles(stats.team.yards)

  const htmlTemplate = await loadMonthlyReviewHtml()
  const subject = monthlyReviewSubject(monthName)
  const resend = getResendClient()
  const from = getResendFrom()
  const replyTo = getResendReplyTo()
  const emailIds: string[] = []

  try {
    for (let i = 0; i < resolved.recipients.length; i += BATCH_SIZE) {
      const chunk = resolved.recipients.slice(i, i + BATCH_SIZE)
      const payload = chunk.map((recipient) => {
        const userStats = recipient.userId
          ? stats.byUser.get(recipient.userId)
          : undefined
        const userCheckIns = userStats?.checkIns ?? 0
        const userMiles = formatSwimMiles(userStats?.yards ?? 0)
        const html = personalizeMonthlyReviewEmail(htmlTemplate, {
          firstName: recipient.firstName || 'there',
          monthName,
          teamCheckIns,
          teamMiles,
          userCheckIns,
          userMiles,
          hasNoCheckIns: userCheckIns === 0,
        })
        return {
          from,
          to: [recipient.email.trim().toLowerCase()],
          replyTo,
          subject,
          html,
          ...(scheduledAt ? { scheduledAt } : {}),
          tags: [
            { name: 'campaign', value: MONTHLY_REVIEW_CAMPAIGN },
            { name: 'audience', value: input.audience },
          ],
        }
      })

      const { data, error } = await resend.batch.send(payload)
      if (error) {
        return {
          error:
            emailIds.length > 0
              ? `Partially sent (${emailIds.length} queued), then failed: ${error.message}`
              : error.message,
        }
      }

      const ids = (data?.data ?? [])
        .map((item) => item.id)
        .filter((id): id is string => !!id)
      emailIds.push(...ids)

      const supabase = createClient()
      const now = new Date().toISOString()
      const rows = chunk.map((recipient, index) => {
        const userStats = recipient.userId
          ? stats.byUser.get(recipient.userId)
          : undefined
        const userCheckIns = userStats?.checkIns ?? 0
        return {
          emailId: ids[index] ?? `pending-${recipient.id}-${Date.now()}`,
          recipientEmail: recipient.email.trim().toLowerCase(),
          eventType: scheduledAt ? 'email.scheduled' : 'email.sent',
          timestamp: scheduledAt ?? now,
          userId: recipient.userId,
          year: String(parsed.year),
          metadata: {
            campaign: MONTHLY_REVIEW_CAMPAIGN,
            audience: input.audience,
            scheduledAt: scheduledAt ?? null,
            subject,
            month: parsed.isoMonth,
            teamCheckIns: stats.team.checkIns,
            teamMiles,
            userCheckIns,
            hasNoCheckIns: userCheckIns === 0,
          },
        }
      })
      await supabase.from('email_tracking').insert(rows)
    }
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'Failed to send emails via Resend.',
    }
  }

  revalidatePath('/admin/emails')
  revalidatePath('/admin')

  return {
    success: true,
    queued: emailIds.length || resolved.recipients.length,
    scheduled: !!scheduledAt,
    scheduledAt,
    emailIds,
  }
}
