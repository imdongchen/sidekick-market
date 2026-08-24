import {
  type EmailAudience,
  resolveRecipients,
} from '@/app/admin/emails/recipients'
import {
  MONTHLY_REVIEW_CAMPAIGN,
  monthlyReviewSubject,
  personalizeMonthlyReviewEmail,
} from '@/lib/emails/monthly-swim-review'
import { loadMonthlyReviewHtml } from '@/lib/emails/monthly-swim-review.server'
import {
  formatReviewMonthName,
  formatSwimCount,
  formatSwimMiles,
  getMonthlySwimStats,
  getTeamMemberUserIds,
  parseReviewMonth,
} from '@/lib/monthly-swim-stats'
import { getResendClient, getResendFrom, getResendReplyTo } from '@/lib/resend'
import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

export type DispatchMonthlyReviewInput = {
  audience: EmailAudience
  memberIds?: number[]
  /** YYYY-MM */
  month: string
  mode: 'now' | 'schedule'
  scheduledAt?: string
  /** When true, skip if this campaign+month already has tracking rows. */
  skipIfAlreadySent?: boolean
  /** Extra metadata merged into email_tracking rows. */
  source?: 'admin' | 'cron'
}

export type DispatchMonthlyReviewResult =
  | {
      success: true
      queued: number
      scheduled: boolean
      scheduledAt?: string
      emailIds: string[]
      skipped?: boolean
      reason?: string
    }
  | { error: string }

const BATCH_SIZE = 100

type DbClient = SupabaseClient<Database>

async function alreadySentForMonth(
  supabase: DbClient,
  isoMonth: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('email_tracking')
    .select('id, metadata')
    .order('timestamp', { ascending: false })
    .limit(300)

  if (error) {
    console.error('monthly review idempotency check failed', error.message)
    return false
  }

  return (data ?? []).some((row) => {
    const meta = row.metadata
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return false
    const record = meta as Record<string, unknown>
    return (
      record.campaign === MONTHLY_REVIEW_CAMPAIGN && record.month === isoMonth
    )
  })
}

export async function dispatchMonthlyReviewCampaign(
  supabase: DbClient,
  input: DispatchMonthlyReviewInput,
): Promise<DispatchMonthlyReviewResult> {
  const parsed = parseReviewMonth(input.month?.trim() ?? '')
  if (!parsed) {
    return { error: 'Choose a valid month before sending.' }
  }

  const monthName = formatReviewMonthName(parsed.isoMonth)

  if (input.skipIfAlreadySent) {
    const already = await alreadySentForMonth(supabase, parsed.isoMonth)
    if (already) {
      return {
        success: true,
        queued: 0,
        scheduled: false,
        emailIds: [],
        skipped: true,
        reason: `Monthly review for ${parsed.isoMonth} was already queued.`,
      }
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

  const resolved = await resolveRecipients(
    input.audience,
    input.memberIds,
    supabase,
  )
  if ('error' in resolved) {
    return { error: resolved.error }
  }

  const memberUserIds = await getTeamMemberUserIds(supabase)
  const stats = await getMonthlySwimStats(
    parsed.isoMonth,
    memberUserIds,
    supabase,
  )
  const teamCheckIns = formatSwimCount(stats.team.checkIns)
  const teamMiles = formatSwimMiles(stats.team.yards)

  const htmlTemplate = await loadMonthlyReviewHtml()
  const subject = monthlyReviewSubject(monthName)
  const resend = getResendClient()
  const from = getResendFrom()
  const replyTo = getResendReplyTo()
  const emailIds: string[] = []
  const source = input.source ?? 'admin'

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
            { name: 'source', value: source },
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
            source,
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

  return {
    success: true,
    queued: emailIds.length || resolved.recipients.length,
    scheduled: !!scheduledAt,
    scheduledAt,
    emailIds,
  }
}
