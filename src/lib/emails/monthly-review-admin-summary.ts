import { getResendClient, getResendFrom } from '@/lib/resend'

export const MONTHLY_REVIEW_ADMIN_SUMMARY_TO =
  process.env.MONTHLY_REVIEW_ADMIN_EMAIL ?? 'admin@sidekickswim.com'

export type MonthlyReviewSendSummary = {
  monthName: string
  isoMonth: string
  source: string
  audience: string
  /** Recipients in the audience before per-recipient dedupe */
  audienceCount: number
  /** Already had this month’s email — not attempted this run */
  skippedAlreadySent: number
  /** Attempted this run (after skipping already-sent) */
  attempted: number
  /** Successfully queued with Resend this run */
  succeeded: number
  /** Not queued this run (remaining after a failure, or attempt failures) */
  failed: number
  scheduled: boolean
  error?: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function buildMonthlyReviewAdminSummaryHtml(
  summary: MonthlyReviewSendSummary,
) {
  const statusLabel = summary.error
    ? 'Completed with errors'
    : summary.succeeded === 0 && summary.attempted === 0
      ? 'Nothing to send'
      : 'Completed'

  const rows: [string, string][] = [
    ['Month', summary.monthName],
    ['Period', summary.isoMonth],
    ['Source', summary.source],
    ['Audience', summary.audience],
    ['Audience size', String(summary.audienceCount)],
    ['Already sent (skipped)', String(summary.skippedAlreadySent)],
    ['Attempted this run', String(summary.attempted)],
    ['Succeeded', String(summary.succeeded)],
    ['Failed', String(summary.failed)],
    ['Mode', summary.scheduled ? 'Scheduled' : 'Send now'],
    ['Status', statusLabel],
  ]
  if (summary.error) {
    rows.push(['Error', summary.error])
  }

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7; color: #52525b; font-size: 14px;">${escapeHtml(label)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7; color: #18181b; font-size: 14px; font-weight: 600;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Monthly review send summary</title></head>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:20px 24px;background:#09090b;color:#ffffff;">
          <p style="margin:0;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;opacity:0.7;">Sidekick</p>
          <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;">Monthly review send summary</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 12px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tableRows}</table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export function monthlyReviewAdminSummarySubject(
  summary: MonthlyReviewSendSummary,
) {
  const outcome = summary.error
    ? 'partial failure'
    : summary.succeeded === 0 && summary.attempted === 0
      ? 'nothing to send'
      : 'ok'
  return `[Sidekick] ${summary.monthName} monthly review — ${summary.succeeded} sent, ${summary.failed} failed (${outcome})`
}

/** Best-effort admin notification; never throws to the caller. */
export async function sendMonthlyReviewAdminSummary(
  summary: MonthlyReviewSendSummary,
) {
  try {
    const resend = getResendClient()
    const { error } = await resend.emails.send({
      from: getResendFrom(),
      to: [MONTHLY_REVIEW_ADMIN_SUMMARY_TO],
      subject: monthlyReviewAdminSummarySubject(summary),
      html: buildMonthlyReviewAdminSummaryHtml(summary),
      tags: [
        { name: 'campaign', value: 'monthly-swim-review-admin-summary' },
        { name: 'source', value: summary.source },
      ],
    })
    if (error) {
      console.error('monthly review admin summary failed', error.message)
    }
  } catch (err) {
    console.error(
      'monthly review admin summary exception',
      err instanceof Error ? err.message : err,
    )
  }
}
