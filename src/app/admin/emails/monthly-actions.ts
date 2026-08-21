'use server'

import {
  type EmailAudience,
  resolveRecipients,
} from '@/app/admin/emails/recipients'
import { isAdminDemoMode } from '@/lib/admin-demo-server'
import { getCheckInEngagementByUserIds } from '@/lib/engagement'
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
  month: string
  checkIns: string
  miles: string
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

const BATCH_SIZE = 100

export async function sendMonthlyReviewCampaign(
  input: SendMonthlyReviewInput,
): Promise<SendMonthlyReviewResult> {
  await requireStaff()

  const month = input.month?.trim()
  const checkIns = input.checkIns?.trim()
  const miles = input.miles?.trim()
  if (!month || !checkIns || !miles) {
    return {
      error: 'Enter the month label, check-in total, and miles before sending.',
    }
  }

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

  const engagement = await getCheckInEngagementByUserIds(
    resolved.recipients.map((r) => r.userId),
  )

  const htmlTemplate = await loadMonthlyReviewHtml()
  const subject = monthlyReviewSubject(month)
  const resend = getResendClient()
  const from = getResendFrom()
  const replyTo = getResendReplyTo()
  const emailIds: string[] = []

  try {
    for (let i = 0; i < resolved.recipients.length; i += BATCH_SIZE) {
      const chunk = resolved.recipients.slice(i, i + BATCH_SIZE)
      const payload = chunk.map((recipient) => {
        const monthlyCheckIns = recipient.userId
          ? (engagement.get(recipient.userId)?.monthlyCheckIns ?? 0)
          : 0
        const html = personalizeMonthlyReviewEmail(htmlTemplate, {
          firstName: recipient.firstName || 'there',
          month,
          checkIns,
          miles,
          hasNoCheckIns: monthlyCheckIns === 0,
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
        const monthlyCheckIns = recipient.userId
          ? (engagement.get(recipient.userId)?.monthlyCheckIns ?? 0)
          : 0
        return {
          emailId: ids[index] ?? `pending-${recipient.id}-${Date.now()}`,
          recipientEmail: recipient.email.trim().toLowerCase(),
          eventType: scheduledAt ? 'email.scheduled' : 'email.sent',
          timestamp: scheduledAt ?? now,
          userId: recipient.userId,
          year: null,
          metadata: {
            campaign: MONTHLY_REVIEW_CAMPAIGN,
            audience: input.audience,
            scheduledAt: scheduledAt ?? null,
            subject,
            month,
            hasNoCheckIns: monthlyCheckIns === 0,
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
