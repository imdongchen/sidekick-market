/**
 * Branded Sidekick email shell for Resend Templates.
 * Use triple-mustache variables ({{{VAR}}}) — required by Resend Templates.
 */

export const USER_FIRST_NAME_VAR = 'USER_FIRST_NAME'

export type SidekickEmailContent = {
  subject: string
  headline: string
  /** Plain text body; paragraphs separated by blank lines */
  body: string
  ctaLabel?: string
  ctaUrl?: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** Convert plain text into safe HTML paragraphs (supports **bold**). */
export function bodyToHtml(body: string) {
  const paragraphs = body
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) {
    return '<p style="margin: 0 0 16px; color: #a1a1aa;">Write your message…</p>'
  }

  return paragraphs
    .map((paragraph) => {
      const withBreaks = escapeHtml(paragraph).replaceAll('\n', '<br />')
      const withBold = withBreaks.replace(
        /\*\*(.+?)\*\*/g,
        '<strong>$1</strong>',
      )
      return `<p style="margin: 0 0 16px">${withBold}</p>`
    })
    .join('\n')
}

export function buildSidekickEmailHtml(content: SidekickEmailContent) {
  const headline = escapeHtml(content.headline.trim() || 'Message from Sidekick')
  const bodyHtml = bodyToHtml(content.body)
  const ctaLabel = content.ctaLabel?.trim()
  const ctaUrl = content.ctaUrl?.trim()
  const showCta = !!(ctaLabel && ctaUrl)

  const ctaBlock = showCta
    ? `
            <tr>
              <td style="padding: 8px 28px 16px">
                <a
                  href="${escapeHtml(ctaUrl!)}"
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
                  >${escapeHtml(ctaLabel!)}</a
                >
              </td>
            </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(content.subject.trim() || 'Sidekick')}</title>
  </head>
  <body
    style="
      margin: 0;
      padding: 0;
      background: #e8f1fa;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial,
        sans-serif;
      color: #18181b;
    "
  >
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background: #e8f1fa; padding: 32px 16px"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="
              max-width: 560px;
              background: #ffffff;
              border-radius: 16px;
              overflow: hidden;
            "
          >
            <tr>
              <td
                style="
                  padding: 28px 28px 8px;
                  background: linear-gradient(180deg, #dbeafe 0%, #ffffff 100%);
                "
              >
                <p
                  style="
                    margin: 0 0 8px;
                    font-size: 13px;
                    font-weight: 600;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    color: #0369a1;
                  "
                >
                  Sidekick
                </p>
                <h1
                  style="
                    margin: 0;
                    font-size: 28px;
                    line-height: 1.2;
                    font-weight: 700;
                    color: #09090b;
                  "
                >
                  ${headline}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 28px 8px; font-size: 16px; line-height: 1.55">
                <p style="margin: 0 0 16px">Hi {{{${USER_FIRST_NAME_VAR}}}},</p>
                ${bodyHtml}
              </td>
            </tr>
            ${ctaBlock}
            <tr>
              <td
                style="
                  padding: 24px 28px 32px;
                  font-size: 16px;
                  line-height: 1.55;
                "
              >
                <p style="margin: 0 0 16px">
                  Questions or feedback? Reply to this email or write us at
                  <a href="mailto:admin@sidekickswim.com" style="color: #0369a1"
                    >admin@sidekickswim.com</a
                  >.
                </p>
                <p style="margin: 0">
                  See you at the pool,<br />
                  The Sidekick team<br />
                  <a href="https://sidekickswim.com" style="color: #0369a1"
                    >sidekickswim.com</a
                  >
                </p>
              </td>
            </tr>
          </table>
          <p
            style="
              margin: 20px 0 0;
              font-size: 12px;
              line-height: 1.4;
              color: #71717a;
              text-align: center;
            "
          >
            You’re receiving this because you have a Sidekick account.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

/** Local preview: replace Resend template variables with sample values. */
export function previewSidekickEmailHtml(
  html: string,
  vars: { firstName?: string } = {},
) {
  return html.replaceAll(
    `{{{${USER_FIRST_NAME_VAR}}}}`,
    escapeHtml(vars.firstName || 'Alex'),
  )
}

export function slugifyAlias(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}
