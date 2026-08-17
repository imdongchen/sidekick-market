'use server'

import { DEMO_RESEND_TEMPLATES } from '@/lib/admin-demo-data'
import { isAdminDemoMode } from '@/lib/admin-demo-server'
import {
  buildSidekickEmailHtml,
  slugifyAlias,
  USER_FIRST_NAME_VAR,
  type SidekickEmailContent,
} from '@/lib/emails/sidekick-layout'
import { getResendClient, getResendFrom, getResendReplyTo } from '@/lib/resend'
import { requireStaff } from '@/supabase/auth'
import { createClient } from '@/supabase/server'
import type { Profile } from '@/types/database'
import { revalidatePath } from 'next/cache'
import type { EmailAudience } from './actions'

export type ResendTemplateSummary = {
  id: string
  name: string
  alias: string | null
  status: 'draft' | 'published'
  publishedAt: string | null
  updatedAt: string
  createdAt: string
}

export type DraftEmailInput = SidekickEmailContent & {
  name: string
  alias?: string
  /** When set, updates an existing Resend template instead of creating */
  templateId?: string
  /** If true, publish immediately after create/update */
  publish?: boolean
}

export type DraftEmailResult =
  | {
      success: true
      templateId: string
      alias: string | null
      published: boolean
    }
  | { error: string }

export type SendTemplateCampaignInput = {
  templateId: string
  audience: EmailAudience
  memberIds?: number[]
  mode: 'now' | 'schedule'
  scheduledAt?: string
  /** Override subject for this send (optional) */
  subject?: string
}

export type SendTemplateCampaignResult =
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

function requireResendKey(): { error: string } | null {
  if (!process.env.RESEND_API_KEY) {
    return {
      error:
        'RESEND_API_KEY is not configured on the server. Add it to your environment and try again.',
    }
  }
  return null
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
    const ids = [
      ...new Set((memberIds ?? []).filter((id) => Number.isFinite(id))),
    ]
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

function validateDraftContent(input: DraftEmailInput): string | null {
  if (!input.name?.trim()) return 'Enter a template name.'
  if (!input.subject?.trim()) return 'Enter a subject line.'
  if (!input.headline?.trim()) return 'Enter a headline.'
  if (!input.body?.trim()) return 'Enter the email body.'
  const ctaLabel = input.ctaLabel?.trim()
  const ctaUrl = input.ctaUrl?.trim()
  if ((ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl)) {
    return 'Provide both a CTA label and URL, or leave both empty.'
  }
  if (ctaUrl) {
    try {
      const url = new URL(ctaUrl)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return 'CTA URL must start with http:// or https://'
      }
    } catch {
      return 'CTA URL is not a valid URL.'
    }
  }
  return null
}

export async function listResendTemplates(): Promise<
  { templates: ResendTemplateSummary[] } | { error: string }
> {
  await requireStaff()
  if (isAdminDemoMode()) {
    return { templates: DEMO_RESEND_TEMPLATES }
  }
  const keyError = requireResendKey()
  if (keyError) return keyError

  try {
    const resend = getResendClient()
    const templates: ResendTemplateSummary[] = []
    let after: string | undefined

    // Paginate until exhausted (Resend max 100 / page).
    for (let page = 0; page < 20; page++) {
      const { data, error } = await resend.templates.list({
        limit: 100,
        ...(after ? { after } : {}),
      })
      if (error) {
        return { error: error.message }
      }
      const batch = data?.data ?? []
      for (const item of batch) {
        templates.push({
          id: item.id,
          name: item.name,
          alias: item.alias,
          status: item.status,
          publishedAt: item.published_at,
          updatedAt: item.updated_at,
          createdAt: item.created_at,
        })
      }
      if (!data?.has_more || batch.length === 0) break
      after = batch[batch.length - 1]?.id
      if (!after) break
    }

    templates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return { templates }
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : 'Failed to list Resend templates.',
    }
  }
}

export async function saveEmailDraft(
  input: DraftEmailInput,
): Promise<DraftEmailResult> {
  await requireStaff()

  const validationError = validateDraftContent(input)
  if (validationError) return { error: validationError }

  if (isAdminDemoMode()) {
    const alias =
      slugifyAlias(input.alias?.trim() || input.name) ||
      `sidekick-${Date.now().toString(36)}`
    return {
      success: true,
      templateId: input.templateId?.trim() || 'tmpl_demo_saved',
      alias,
      published: !!input.publish,
    }
  }

  const keyError = requireResendKey()
  if (keyError) return keyError

  const name = input.name.trim()
  const subject = input.subject.trim()
  const alias =
    slugifyAlias(input.alias?.trim() || name) ||
    `sidekick-${Date.now().toString(36)}`
  const from = getResendFrom()
  const replyTo = getResendReplyTo()
  const html = buildSidekickEmailHtml({
    subject,
    headline: input.headline,
    body: input.body,
    ctaLabel: input.ctaLabel,
    ctaUrl: input.ctaUrl,
  })

  const variables = [
    {
      key: USER_FIRST_NAME_VAR,
      type: 'string' as const,
      fallbackValue: 'there',
    },
  ]

  try {
    const resend = getResendClient()
    let templateId = input.templateId?.trim()

    if (templateId) {
      const { error } = await resend.templates.update(templateId, {
        name,
        alias,
        subject,
        from,
        replyTo,
        html,
        variables,
      })
      if (error) return { error: error.message }
    } else {
      const { data, error } = await resend.templates.create({
        name,
        alias,
        subject,
        from,
        replyTo,
        html,
        variables,
      })
      if (error) return { error: error.message }
      if (!data?.id) return { error: 'Resend did not return a template id.' }
      templateId = data.id
    }

    let published = false
    if (input.publish) {
      const { error } = await resend.templates.publish(templateId)
      if (error) {
        return {
          error: `Draft saved (${templateId}) but publish failed: ${error.message}`,
        }
      }
      published = true
    }

    revalidatePath('/admin/emails')
    return {
      success: true,
      templateId,
      alias,
      published,
    }
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'Failed to save email draft via Resend.',
    }
  }
}

export async function publishEmailTemplate(
  templateId: string,
): Promise<{ success: true } | { error: string }> {
  await requireStaff()
  if (isAdminDemoMode()) {
    const id = templateId?.trim()
    if (!id) return { error: 'Missing template id.' }
    return { success: true }
  }
  const keyError = requireResendKey()
  if (keyError) return keyError

  const id = templateId?.trim()
  if (!id) return { error: 'Missing template id.' }

  try {
    const resend = getResendClient()
    const { error } = await resend.templates.publish(id)
    if (error) return { error: error.message }
    revalidatePath('/admin/emails')
    return { success: true }
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'Failed to publish template via Resend.',
    }
  }
}

export async function sendTemplateCampaign(
  input: SendTemplateCampaignInput,
): Promise<SendTemplateCampaignResult> {
  await requireStaff()

  const templateId = input.templateId?.trim()
  if (!templateId) {
    return { error: 'Choose a Resend template to send.' }
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
        (recipient) => `demo-${recipient.id}-${Date.now()}`,
      ),
    }
  }

  const keyError = requireResendKey()
  if (keyError) return keyError

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

  try {
    const resend = getResendClient()
    const { data: template, error: templateError } =
      await resend.templates.get(templateId)
    if (templateError) {
      return { error: templateError.message }
    }
    if (!template) {
      return { error: 'Template not found in Resend.' }
    }
    if (template.status !== 'published') {
      return {
        error:
          'Publish this template in Resend before sending. Draft templates cannot be used to send.',
      }
    }

    const resolved = await resolveRecipients(input.audience, input.memberIds)
    if ('error' in resolved) {
      return { error: resolved.error }
    }

    const from = getResendFrom()
    const replyTo = getResendReplyTo()
    const subject =
      input.subject?.trim() || template.subject || 'Message from Sidekick'
    const campaignTag = (template.alias || template.id)
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 50)
    const emailIds: string[] = []

    for (let i = 0; i < resolved.recipients.length; i += BATCH_SIZE) {
      const chunk = resolved.recipients.slice(i, i + BATCH_SIZE)
      const payload = chunk.map((recipient) => ({
        from,
        to: [recipient.email.trim().toLowerCase()],
        replyTo,
        subject,
        ...(scheduledAt ? { scheduledAt } : {}),
        template: {
          id: template.alias || template.id,
          variables: {
            [USER_FIRST_NAME_VAR]: recipient.firstName || 'there',
          },
        },
        tags: [
          { name: 'campaign', value: campaignTag || 'custom-template' },
          { name: 'audience', value: input.audience },
        ],
      }))

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
      const rows = chunk.map((recipient, index) => ({
        emailId: ids[index] ?? `pending-${recipient.id}-${Date.now()}`,
        recipientEmail: recipient.email.trim().toLowerCase(),
        eventType: scheduledAt ? 'email.scheduled' : 'email.sent',
        timestamp: scheduledAt ?? now,
        userId: recipient.userId,
        year: null,
        metadata: {
          campaign: campaignTag,
          templateId: template.id,
          templateAlias: template.alias,
          audience: input.audience,
          scheduledAt: scheduledAt ?? null,
          subject,
        },
      }))
      await supabase.from('email_tracking').insert(rows)
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
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'Failed to send templated emails via Resend.',
    }
  }
}
