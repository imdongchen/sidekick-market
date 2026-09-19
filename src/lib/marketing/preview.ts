export const MARKETING_PREVIEW_COOKIE = 'sidekick_marketing_preview'

export function marketingPreviewCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure,
    maxAge: 60 * 60 * 8, // 8 hours
  }
}
