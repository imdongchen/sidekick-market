import { Resend, type CreateBatchOptions } from 'resend'

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY is not configured. Add it to the server environment.',
    )
  }
  return new Resend(apiKey)
}

export function getResendFrom() {
  return (
    process.env.RESEND_FROM ?? 'Sidekick <admin@sidekickswim.com>'
  )
}

export function getResendReplyTo() {
  return process.env.RESEND_REPLY_TO ?? 'admin@sidekickswim.com'
}

export type RecipientFailure = { email: string; message: string }

const MAX_LISTED_FAILURES = 10

export function describeRecipientFailures(failures: RecipientFailure[]) {
  const listed = failures
    .slice(0, MAX_LISTED_FAILURES)
    .map((f) => `${f.email} (${f.message})`)
  const more = failures.length - listed.length
  return `${failures.length} email${failures.length === 1 ? '' : 's'} failed: ${listed.join('; ')}${more > 0 ? `; and ${more} more` : ''}`
}

export type BatchSendResult = {
  /** `id` is null when Resend accepted the email but its ID could not be matched to a payload index. */
  sent: { index: number; id: string | null }[]
  failed: { index: number; message: string }[]
}

/**
 * Sends a batch in permissive mode so invalid emails are rejected
 * individually instead of failing the whole batch. Returns `{ error }` only
 * when the request itself fails (auth, rate limit, network).
 */
export async function sendBatchPermissive(
  resend: Resend,
  payload: CreateBatchOptions,
): Promise<BatchSendResult | { error: string }> {
  const { data, error } = await resend.batch.send(payload, {
    batchValidation: 'permissive',
  })
  if (error) return { error: error.message }

  const failed = (data?.errors ?? []).map(({ index, message }) => ({
    index,
    message,
  }))
  const failedIndexes = new Set(failed.map((f) => f.index))
  const sentIndexes = payload
    .map((_, index) => index)
    .filter((index) => !failedIndexes.has(index))

  // Resend may return one ID per payload item or one per accepted item.
  const ids = (data?.data ?? []).map((item) => item.id ?? null)
  const idFor = (index: number, position: number): string | null => {
    if (ids.length === payload.length) return ids[index] ?? null
    if (ids.length === sentIndexes.length) return ids[position] ?? null
    return null
  }

  return {
    sent: sentIndexes.map((index, position) => ({
      index,
      id: idFor(index, position),
    })),
    failed,
  }
}
