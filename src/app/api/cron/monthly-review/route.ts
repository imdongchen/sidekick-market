import { dispatchMonthlyReviewCampaign } from '@/lib/emails/send-monthly-review'
import { previousReviewMonthValue } from '@/lib/monthly-swim-stats-shared'
import { createServiceClient } from '@/supabase/service'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Vercel Cron: 1st of each month at 15:00 UTC (`vercel.json`).
 * Sends the previous calendar month's swim review to all members.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends this when
 * CRON_SECRET is set). Manual test: same header or `?secret=`.
 */
export async function GET(request: Request) {
  const authError = authorizeCron(request)
  if (authError) return authError

  if (process.env.VERCEL_ENV === 'preview') {
    return NextResponse.json(
      {
        ok: true,
        skipped: true,
        reason: 'Monthly review cron is disabled on Vercel Preview.',
      },
      { status: 200 },
    )
  }

  const url = new URL(request.url)
  const monthParam = url.searchParams.get('month')
  const month = monthParam?.trim() || previousReviewMonthValue()

  try {
    const supabase = createServiceClient()
    const result = await dispatchMonthlyReviewCampaign(supabase, {
      audience: 'all_members',
      month,
      mode: 'now',
      skipAlreadySentRecipients: true,
      source: 'cron',
    })

    if ('error' in result) {
      console.error('monthly review cron failed', result.error)
      return NextResponse.json(
        { ok: false, month, error: result.error },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      month,
      queued: result.queued,
      skipped: result.skipped ?? false,
      skippedRecipients: result.skippedRecipients ?? 0,
      reason: result.reason,
      emailIds: result.emailIds,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cron failed.'
    console.error('monthly review cron exception', message)
    return NextResponse.json(
      { ok: false, month, error: message },
      { status: 500 },
    )
  }
}

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'CRON_SECRET is not configured. Set it in the Vercel project env.',
      },
      { status: 500 },
    )
  }

  const header = request.headers.get('authorization')
  const bearer = header?.startsWith('Bearer ')
    ? header.slice('Bearer '.length)
    : null
  const querySecret = new URL(request.url).searchParams.get('secret')

  if (bearer === secret || querySecret === secret) {
    return null
  }

  return NextResponse.json(
    { ok: false, error: 'Unauthorized.' },
    { status: 401 },
  )
}
