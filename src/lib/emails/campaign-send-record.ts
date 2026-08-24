import type { Database, EmailCampaignSend } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

type DbClient = SupabaseClient<Database>

export type CampaignSendClaim =
  | { status: 'claimed'; id: number }
  | { status: 'already_sent'; row: EmailCampaignSend }
  | { status: 'in_progress'; row: EmailCampaignSend }
  | { status: 'error'; error: string }

/**
 * Claim a unique (campaign, period) send slot.
 * - Inserts a pending row when none exists
 * - Reclaims a failed row for retry
 * - Reports already_sent / in_progress when a live row blocks a new send
 */
export async function claimCampaignSend(
  supabase: DbClient,
  input: {
    campaign: string
    period: string
    source: string
    metadata?: EmailCampaignSend['metadata']
  },
): Promise<CampaignSendClaim> {
  const now = new Date().toISOString()

  const { data: existing, error: readError } = await supabase
    .from('email_campaign_send')
    .select('*')
    .eq('campaign', input.campaign)
    .eq('period', input.period)
    .maybeSingle()

  if (readError) {
    return { status: 'error', error: readError.message }
  }

  if (existing) {
    if (existing.status === 'sent') {
      return { status: 'already_sent', row: existing }
    }
    if (existing.status === 'pending') {
      return { status: 'in_progress', row: existing }
    }
    // failed → reclaim for retry
    const { data: updated, error: updateError } = await supabase
      .from('email_campaign_send')
      .update({
        status: 'pending',
        source: input.source,
        queuedCount: 0,
        sentAt: null,
        error: null,
        metadata: input.metadata ?? existing.metadata,
        updatedAt: now,
      })
      .eq('id', existing.id)
      .select('id')
      .maybeSingle()

    if (updateError) {
      return { status: 'error', error: updateError.message }
    }
    return { status: 'claimed', id: updated?.id ?? existing.id }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('email_campaign_send')
    .insert({
      campaign: input.campaign,
      period: input.period,
      source: input.source,
      status: 'pending',
      queuedCount: 0,
      sentAt: null,
      error: null,
      metadata: input.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .select('id')
    .maybeSingle()

  if (insertError) {
    // Unique race: another worker claimed first — re-read.
    if (insertError.code === '23505') {
      const { data: raced } = await supabase
        .from('email_campaign_send')
        .select('*')
        .eq('campaign', input.campaign)
        .eq('period', input.period)
        .maybeSingle()
      if (raced?.status === 'sent') {
        return { status: 'already_sent', row: raced }
      }
      if (raced) {
        return { status: 'in_progress', row: raced }
      }
    }
    return { status: 'error', error: insertError.message }
  }

  if (!inserted?.id) {
    return { status: 'error', error: 'Failed to claim campaign send row.' }
  }

  return { status: 'claimed', id: inserted.id }
}

export async function markCampaignSendSent(
  supabase: DbClient,
  id: number,
  queuedCount: number,
  metadata?: EmailCampaignSend['metadata'],
) {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('email_campaign_send')
    .update({
      status: 'sent',
      queuedCount,
      sentAt: now,
      error: null,
      ...(metadata != null ? { metadata } : {}),
      updatedAt: now,
    })
    .eq('id', id)

  if (error) {
    console.error('markCampaignSendSent failed', error.message)
  }
}

export async function markCampaignSendFailed(
  supabase: DbClient,
  id: number,
  errorMessage: string,
) {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('email_campaign_send')
    .update({
      status: 'failed',
      error: errorMessage.slice(0, 2000),
      updatedAt: now,
    })
    .eq('id', id)

  if (error) {
    console.error('markCampaignSendFailed failed', error.message)
  }
}
