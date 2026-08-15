import { Resend } from 'resend'

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
