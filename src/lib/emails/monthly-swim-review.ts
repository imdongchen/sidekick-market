export const MONTHLY_REVIEW_CAMPAIGN = 'monthly-swim-review'

export type MonthlyReviewVars = {
  firstName: string
  month: string
  checkIns: string
  miles: string
  /** True when the recipient has zero check-ins for the month */
  hasNoCheckIns: boolean
}

export function monthlyReviewSubject(month: string) {
  return `Your team’s ${month} swim review`
}

export function buildPersonalNudgeHtml(hasNoCheckIns: boolean) {
  if (hasNoCheckIns) {
    return `<p style="margin: 0 0 16px; padding: 14px 16px; background: #f0f9ff; border-radius: 12px; font-size: 16px; line-height: 1.55; color: #0c4a6e;">
                  We noticed you haven’t checked in yet this month. Open Sidekick and log your next swim — it only takes a few seconds, and it helps the whole team see the full picture.
                </p>`
  }
  return `<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.55;">
                  You’ve been checking in — nice work. Peek at your swims in the app to celebrate the month and see what’s next.
                </p>`
}

export function personalizeMonthlyReviewEmail(
  html: string,
  vars: MonthlyReviewVars,
) {
  return html
    .replaceAll('{{firstName}}', vars.firstName || 'there')
    .replaceAll('{{MONTH}}', vars.month)
    .replaceAll('{{CHECK_INS}}', vars.checkIns)
    .replaceAll('{{MILES}}', vars.miles)
    .replaceAll('{{PERSONAL_NUDGE}}', buildPersonalNudgeHtml(vars.hasNoCheckIns))
}

/** Default month label for the campaign (current calendar month). */
export function defaultReviewMonthLabel(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}
