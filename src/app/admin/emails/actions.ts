'use server'

import { revalidatePath } from 'next/cache'
import { loadReintroduceHtml } from '@/lib/emails/reintroduce-sidekick.server'
import {
  personalizeReintroduceEmail,
  REINTRODUCE_CAMPAIGN,
  REINTRODUCE_SUBJECT,
} from '@/lib/emails/reintroduce-sidekick'
import {
  getResendClient,
  getResendFrom,
  getResendReplyTo,
} from '@/lib/resend'
import { requireStaff } from '@/supabase/auth'
import { createClient } from '@/supabase/server'
import type { Profile } from '@/types/database'

export type EmailAudience = 'all_members' | 'all_coaches' | 'individuals'

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
    }
  | { error: string }

const BATCH_SIZE = 100

type Recipient = Pick<
  Profile,
  'id' | 'firstName' | 'lastName' | 'email' | 'userId' | 'role' | 'status'
>

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function resolveRecipients(
  audience: EmailAudience,
  memberIds: number[] | undefined,
): Promise<{ recipients: Recipient[] } | { error: string }> {
  const supabase = createClient()

  let query = supabase
    .from('profile')
    .select('id, firstName, lastName, email, userId, role, status')
    .neq('status', 'deactivated')
    .order('lastName', { ascending: true })
    .order('firstName', { ascending: true })
    .limit(1000)

  if (audience === 'all_coaches') {
    query = query.eq('role', 'coach')
  } else if (audience === 'individuals') {
    const ids = [...new Set((memberIds ?? []).filter((id) => Number.isFinite(id)))]
    if (ids.length === 0) {
      return { error: 'Select at least one individual recipient.' }
    }
    query = query.in('id', ids)
  }

  const { data, error } = await query
  if (error) {
    return { error: error.message }
  }

  const recipients = (data ?? []).filter(
    (r) => r.email && isValidEmail(r.email.trim()),
  )

  if (recipients.length === 0) {
    return { error: 'No recipients with a valid email address matched.' }
  }

  return { recipients }
}

export async function sendReintroduceCampaign(
  input: SendReintroduceInput,
): Promise<SendReintroduceResult> {
  await requireStaff()

  const checkIns = input.checkIns?.trim()
  const miles = input.miles?.trim()
  if (!checkIns || !miles) {
    return { error: 'Enter check-in and miles totals before sending.' }
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
      return { error: 'Schedule time must be at least one minute in the future.' }
    }
    scheduledAt = when.toISOString()
  }

  const resolved = await resolveRecipients(input.audience, input.memberIds)
  if ('error' in resolved) {
    return { error: resolved.error }
  }

  const htmlTemplate = await loadReintroduceHtml()
  const resend = getResendClient()
  const from = getResendFrom()
  const replyTo = getResendReplyTo()
  const emailIds: string[] = []

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

      // Best-effort local tracking so the admin table updates before webhooks.
      const supabase = createClient()
      const now = new Date().toISOString()
      const rows = chunk.map((recipient, index) => ({
        emailId: ids[index] ?? `pending-${recipient.id}-${Date.now()}`,
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
      }))
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
