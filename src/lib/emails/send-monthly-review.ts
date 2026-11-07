import {
  type EmailAudience,
  type EmailRecipient,
  resolveRecipients,
} from '@/app/admin/emails/recipients'
import {
  sendMonthlyReviewAdminSummary,
  type MonthlyReviewSendSummary,
} from '@/lib/emails/monthly-review-admin-summary'
import {
  MONTHLY_REVIEW_CAMPAIGN,
  monthlyReviewSubject,
  personalizeMonthlyReviewEmail,
} from '@/lib/emails/monthly-swim-review'
import { loadMonthlyReviewHtml } from '@/lib/emails/monthly-swim-review.server'
import {
  formatAverageCheckIns,
  formatReviewMonthName,
  formatSwimCount,
  formatSwimMiles,
  getMonthlySwimStats,
  getTeamMemberUserIds,
  parseReviewMonth,
  summarizeMonthlySwimStats,
} from '@/lib/monthly-swim-stats'
import {
  describeRecipientFailures,
  getResendClient,
  getResendFrom,
  getResendReplyTo,
  type RecipientFailure,
  sendBatchPermissive,
} from '@/lib/resend'
import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

export type DispatchMonthlyReviewInput = {
  audience: EmailAudience
  memberIds?: number[]
  /** YYYY-MM */
  month: string
  mode: 'now' | 'schedule'
  scheduledAt?: string
  /**
   * When true (default), skip recipients who already have a sent/scheduled
   * email_tracking row for this campaign+month, and retry only the rest.
   */
  skipAlreadySentRecipients?: boolean
  /** @deprecated Use skipAlreadySentRecipients */
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
      /** Recipients Resend rejected; everyone else was still sent */
      failed: RecipientFailure[]
      /** Recipients skipped because they already got this month’s email */
      skippedRecipients?: number
      /** True when every intended recipient was already sent (nothing queued) */
      skipped?: boolean
      reason?: string
    }
  | { error: string }

const BATCH_SIZE = 100
const TRACKING_PAGE_SIZE = 1000

type DbClient = SupabaseClient<Database>

/**
 * Recipient emails that already have a sent/scheduled row for this
 * campaign+month in email_tracking.
 */
async function getAlreadySentRecipientEmails(
  supabase: DbClient,
  isoMonth: string,
): Promise<Set<string> | { error: string }> {
  const sent = new Set<string>()
  let from = 0

  for (;;) {
    const { data, error } = await supabase
      .from('email_tracking')
      .select('recipientEmail')
      .contains('metadata', {
        campaign: MONTHLY_REVIEW_CAMPAIGN,
        month: isoMonth,
      })
      .in('eventType', ['email.sent', 'email.scheduled'])
      .range(from, from + TRACKING_PAGE_SIZE - 1)

    if (error) {
      console.error('monthly review prior-send lookup failed', error.message)
      return { error: error.message }
    }

    const rows = data ?? []
    for (const row of rows) {
      const email = row.recipientEmail?.trim().toLowerCase()
      if (email) sent.add(email)
    }

    if (rows.length < TRACKING_PAGE_SIZE) break
    from += TRACKING_PAGE_SIZE
  }

  return sent
}

function filterUnsentRecipients(
  recipients: EmailRecipient[],
  alreadySent: Set<string>,
) {
  return recipients.filter(
    (r) => !alreadySent.has(r.email.trim().toLowerCase()),
  )
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
  const source = input.source ?? 'admin'
  const skipAlreadySentRecipients =
    input.skipAlreadySentRecipients ??
    input.skipIfAlreadySent ??
    true

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

  const audienceCount = resolved.recipients.length
  let recipients = resolved.recipients
  let skippedRecipients = 0

  if (skipAlreadySentRecipients) {
    const alreadySent = await getAlreadySentRecipientEmails(
      supabase,
      parsed.isoMonth,
    )
    if ('error' in alreadySent) {
      return { error: `Could not check prior sends: ${alreadySent.error}` }
    }

    const remaining = filterUnsentRecipients(recipients, alreadySent)
    skippedRecipients = recipients.length - remaining.length
    recipients = remaining

    if (recipients.length === 0) {
      await sendMonthlyReviewAdminSummary({
        monthName,
        isoMonth: parsed.isoMonth,
        source,
        audience: input.audience,
        audienceCount,
        skippedAlreadySent: skippedRecipients,
        attempted: 0,
        succeeded: 0,
        failed: 0,
        scheduled: false,
      })
      return {
        success: true,
        queued: 0,
        scheduled: false,
        emailIds: [],
        failed: [],
        skippedRecipients,
        skipped: true,
        reason: `All ${skippedRecipients} recipient${skippedRecipients === 1 ? '' : 's'} already received the ${parsed.isoMonth} monthly review.`,
      }
    }
  }

  const memberUserIds = await getTeamMemberUserIds(supabase)
  const stats = await getMonthlySwimStats(
    parsed.isoMonth,
    memberUserIds,
    supabase,
  )
  const highlights = summarizeMonthlySwimStats(
    stats.byUser,
    stats.team,
    memberUserIds.length,
  )
  const averageCheckIns = formatAverageCheckIns(highlights.averageCheckIns)
  const averageMiles = formatSwimMiles(highlights.averageYards)
  const winnerCheckIns = formatSwimCount(highlights.winnerCheckIns)
  const winnerMiles = formatSwimMiles(highlights.winnerYards)

  const htmlTemplate = await loadMonthlyReviewHtml()
  const subject = monthlyReviewSubject(monthName)
  const resend = getResendClient()
  const from = getResendFrom()
  const replyTo = getResendReplyTo()
  const emailIds: string[] = []
  const failures: RecipientFailure[] = []
  let sentCount = 0
  const attempted = recipients.length

  const baseSummary = (): Omit<
    MonthlyReviewSendSummary,
    'succeeded' | 'failed' | 'error'
  > => ({
    monthName,
    isoMonth: parsed.isoMonth,
    source,
    audience: input.audience,
    audienceCount,
    skippedAlreadySent: skippedRecipients,
    attempted,
    scheduled: !!scheduledAt,
  })

  try {
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const chunk = recipients.slice(i, i + BATCH_SIZE)
      const payload = chunk.map((recipient) => {
        const userStats = recipient.userId
          ? stats.byUser.get(recipient.userId)
          : undefined
        const userCheckIns = userStats?.checkIns ?? 0
        const userMiles = formatSwimMiles(userStats?.yards ?? 0)
        const html = personalizeMonthlyReviewEmail(htmlTemplate, {
          firstName: recipient.firstName || 'there',
          monthName,
          averageCheckIns,
          averageMiles,
          winnerCheckIns,
          winnerMiles,
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

      const result = await sendBatchPermissive(resend, payload)
      if ('error' in result) {
        failures.push(
          ...chunk.map((recipient) => ({
            email: recipient.email.trim().toLowerCase(),
            message: result.error,
          })),
        )
        continue
      }

      for (const { index, message } of result.failed) {
        const recipient = chunk[index]
        if (recipient) {
          failures.push({ email: recipient.email.trim().toLowerCase(), message })
        }
      }
      sentCount += result.sent.length

      const now = new Date().toISOString()
      const rows = result.sent.flatMap(({ index, id }) => {
        const recipient = chunk[index]
        if (!recipient) return []
        if (id) emailIds.push(id)
        const userStats = recipient.userId
          ? stats.byUser.get(recipient.userId)
          : undefined
        const userCheckIns = userStats?.checkIns ?? 0
        return {
          emailId: id ?? `pending-${recipient.id}-${Date.now()}`,
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
            averageCheckIns: highlights.averageCheckIns,
            averageMiles,
            winnerCheckIns: highlights.winnerCheckIns,
            winnerMiles,
            userCheckIns,
            hasNoCheckIns: userCheckIns === 0,
            source,
          },
        }
      })
      if (rows.length > 0) {
        await supabase.from('email_tracking').insert(rows)
      }
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to send emails via Resend.'
    await sendMonthlyReviewAdminSummary({
      ...baseSummary(),
      succeeded: sentCount,
      failed: attempted - sentCount,
      error: message,
    })
    return { error: message }
  }

  const failureMessage =
    failures.length > 0 ? describeRecipientFailures(failures) : undefined
  await sendMonthlyReviewAdminSummary({
    ...baseSummary(),
    succeeded: sentCount,
    failed: failures.length,
    error: failureMessage,
  })

  if (sentCount === 0 && failureMessage) {
    return { error: failureMessage }
  }

  return {
    success: true,
    queued: sentCount,
    scheduled: !!scheduledAt,
    scheduledAt,
    emailIds,
    failed: failures,
    skippedRecipients,
  }
}
