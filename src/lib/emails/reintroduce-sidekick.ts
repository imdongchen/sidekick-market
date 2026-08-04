export const REINTRODUCE_SUBJECT =
  'Sidekick is back — a smoother swim app for the team'

export const REINTRODUCE_CAMPAIGN = 'reintroduce-sidekick'

export type ReintroduceVars = {
  firstName: string
  checkIns: string
  miles: string
}

export function personalizeReintroduceEmail(
  html: string,
  vars: ReintroduceVars,
) {
  return html
    .replaceAll('{{firstName}}', vars.firstName || 'there')
    .replaceAll('{{CHECK_INS}}', vars.checkIns)
    .replaceAll('{{MILES}}', vars.miles)
}
