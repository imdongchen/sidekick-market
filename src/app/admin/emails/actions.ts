'use server'

import {
  type EmailAudience,
  resolveRecipients,
} from '@/app/admin/emails/recipients'
import { isAdminDemoMode } from '@/lib/admin-demo-server'
import {
  personalizeReintroduceEmail,
  REINTRODUCE_CAMPAIGN,
  REINTRODUCE_SUBJECT,
} from '@/lib/emails/reintroduce-sidekick'
import { loadReintroduceHtml } from '@/lib/emails/reintroduce-sidekick.server'
import {
  describeRecipientFailures,
  getResendClient,
  getResendFrom,
  getResendReplyTo,
  type RecipientFailure,
  sendBatchPermissive,
} from '@/lib/resend'
import { requireStaff } from '@/supabase/auth'
import { createClient } from '@/supabase/server'
import { revalidatePath } from 'next/cache'

export type { EmailAudience }

export type SendReintroduceInput = {
  audience: EmailAudience
  memberIds?: number[]
  checkIns: string
  miles: string
  mode: 'now' | 'schedule'
  /** ISO 8601 datetime when mode is schedule */
  scheduledAt?: string
}

export type SendReintroduceResult =
  | {
      success: true
      queued: number
      scheduled: boolean
      scheduledAt?: string
      emailIds: string[]
      failed?: RecipientFailure[]
    }
  | { error: string }

const BATCH_SIZE = 100

export async function sendReintroduceCampaign(
  input: SendReintroduceInput,
): Promise<SendReintroduceResult> {
  await requireStaff()

  const checkIns = input.checkIns?.trim()
  const miles = input.miles?.trim()
  if (!checkIns || !miles) {
    return { error: 'Enter check-in and miles totals before sending.' }
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
        (recipient) => `demo-${recipient.id}-${Date.now()}`,
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

  const resolved = await resolveRecipients(
    input.audience,
    input.memberIds,
    supabase,
  )
  if ('error' in resolved) {
    return { error: resolved.error }
  }

  const htmlTemplate = await loadReintroduceHtml()
  const resend = getResendClient()
  const from = getResendFrom()
  const replyTo = getResendReplyTo()
  const emailIds: string[] = []
  const failures: RecipientFailure[] = []
  let sentCount = 0

  try {
    for (let i = 0; i < resolved.recipients.length; i += BATCH_SIZE) {
      const chunk = resolved.recipients.slice(i, i + BATCH_SIZE)
      const payload = chunk.map((recipient) => {
        const html = personalizeReintroduceEmail(htmlTemplate, {
          firstName: recipient.firstName || 'there',
          checkIns,
          miles,
        })
        return {
          from,
          to: [recipient.email.trim().toLowerCase()],
          replyTo,
          subject: REINTRODUCE_SUBJECT,
          html,
          ...(scheduledAt ? { scheduledAt } : {}),
          tags: [
            { name: 'campaign', value: REINTRODUCE_CAMPAIGN },
            { name: 'audience', value: input.audience },
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

      // Best-effort local tracking so the admin table updates before webhooks.
      const supabase = createClient()
      const now = new Date().toISOString()
      const rows = result.sent.flatMap(({ index, id }) => {
        const recipient = chunk[index]
        if (!recipient) return []
        if (id) emailIds.push(id)
        return {
          emailId: id ?? `pending-${recipient.id}-${Date.now()}`,
          recipientEmail: recipient.email.trim().toLowerCase(),
          eventType: scheduledAt ? 'email.scheduled' : 'email.sent',
          timestamp: scheduledAt ?? now,
          userId: recipient.userId,
          year: null,
          metadata: {
            campaign: REINTRODUCE_CAMPAIGN,
            audience: input.audience,
            scheduledAt: scheduledAt ?? null,
            subject: REINTRODUCE_SUBJECT,
          },
        }
      })
      if (rows.length > 0) {
        await supabase.from('email_tracking').insert(rows)
      }
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to send emails via Resend.'
    return {
      error:
        sentCount > 0
          ? `Partially sent (${sentCount} queued), then failed: ${message}`
          : message,
    }
  }

  revalidatePath('/admin/emails')
  revalidatePath('/admin')

  if (sentCount === 0 && failures.length > 0) {
    return { error: describeRecipientFailures(failures) }
  }

  return {
    success: true,
    queued: sentCount,
    scheduled: !!scheduledAt,
    scheduledAt,
    emailIds,
    failed: failures,
  }
}
