export const MONTHLY_REVIEW_CAMPAIGN = 'monthly-swim-review'

export type MonthlyReviewVars = {
  firstName: string
  monthName: string
  teamCheckIns: string
  teamMiles: string
  userCheckIns: number
  userMiles: string
  hasNoCheckIns: boolean
}

export function monthlyReviewSubject(monthName: string) {
  return `Your ${monthName} Swim Review`
}

function buildPersonalBlockHtml(vars: MonthlyReviewVars) {
  if (vars.hasNoCheckIns) {
    return `<p style="margin: 0 0 16px; padding: 14px 16px; background: #f0f9ff; border-radius: 12px; font-size: 16px; line-height: 1.55; color: #0c4a6e;">
                  We noticed you didn’t check in during ${vars.monthName}. Open Sidekick and log your next swim — it only takes a few seconds, and it helps the whole team see the full picture.
                </p>`
  }
  return `<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.55;">
                  You logged <strong>${vars.userCheckIns} check-in${vars.userCheckIns === 1 ? '' : 's'}</strong> and swam <strong>${vars.userMiles} miles</strong> in ${vars.monthName}.
                </p>`
}

function buildAppSectionHtml(hasNoCheckIns: boolean) {
  if (hasNoCheckIns) return ''
  return `<tr>
              <td style="padding: 16px 28px 8px">
                <h2
                  style="
                    margin: 0 0 12px;
                    font-size: 18px;
                    font-weight: 700;
                    color: #09090b;
                  "
                >
                  Check your swims
                </h2>
                <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.55">
                  Jump into the app to review this month’s check-ins and
                  distance.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <a
                        href="https://sidekickswim.com/open"
                        style="
                          display: inline-block;
                          background: #09090b;
                          color: #ffffff;
                          text-decoration: none;
                          font-size: 15px;
                          font-weight: 600;
                          padding: 12px 20px;
                          border-radius: 10px;
                        "
                        >Open Sidekick</a
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
}

export function personalizeMonthlyReviewEmail(
  html: string,
  vars: MonthlyReviewVars,
) {
  return html
    .replaceAll('{{firstName}}', vars.firstName || 'there')
    .replaceAll('{{MONTH}}', vars.monthName)
    .replaceAll('{{TEAM_CHECK_INS}}', vars.teamCheckIns)
    .replaceAll('{{TEAM_MILES}}', vars.teamMiles)
    .replaceAll('{{PERSONAL_BLOCK}}', buildPersonalBlockHtml(vars))
    .replaceAll('{{APP_SECTION}}', buildAppSectionHtml(vars.hasNoCheckIns))
}
