import { z } from 'zod'

export const HOME_PAGE_SLUG = 'home'

export const pageSlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Use lowercase letters, numbers, and hyphens only',
  )

/** Paths reserved by the app — cannot be used as marketing page slugs. */
export const RESERVED_PAGE_SLUGS = new Set([
  HOME_PAGE_SLUG,
  'admin',
  'api',
  'blog',
  'company',
  'login',
  'open',
  'p',
  'pricing',
  'review',
  'studio',
  'teams',
  'favicon.ico',
])

export const homepagePreviewSchema = z.object({
  id: z.string().min(1).max(64),
  src: z.string().min(1).max(500),
  alt: z.string().min(1).max(200),
})

export const homepageContentSchema = z.object({
  brand: z.string().min(1).max(80),
  tagline: z.string().min(1).max(160),
  body: z.string().min(1).max(400),
  appStoreUrl: z.string().url().max(500),
  androidNote: z.string().min(1).max(120),
  contactPrompt: z.string().min(1).max(80),
  contactEmail: z.string().email().max(120),
  metaDescription: z.string().min(1).max(300),
  adminLoginLabel: z.string().min(1).max(40),
  previews: z.array(homepagePreviewSchema).min(1).max(6),
})

export type HomepageContent = z.infer<typeof homepageContentSchema>
export type HomepagePreview = z.infer<typeof homepagePreviewSchema>
/** Alias — same layout is used for home and custom marketing pages. */
export type MarketingPageContent = HomepageContent

/** Partial patch the model may return — missing fields keep current values. */
export const homepageContentPatchSchema = homepageContentSchema
  .partial()
  .extend({
    previews: z.array(homepagePreviewSchema).min(1).max(6).optional(),
  })

export type HomepageContentPatch = z.infer<typeof homepageContentPatchSchema>

export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  brand: 'Sidekick',
  tagline: 'Swim app for teams',
  body: 'Track workouts together, share the schedule, and keep every swimmer in the loop.',
  appStoreUrl:
    'https://apps.apple.com/us/app/sidekick-swim-app-for-teams/id6677036644',
  androidNote: 'Android — coming soon',
  contactPrompt: 'Questions?',
  contactEmail: 'admin@sidekickswim.com',
  metaDescription:
    'Sidekick helps swim teams track workouts, stay connected, and manage schedules and rosters.',
  adminLoginLabel: 'Admin login',
  previews: [
    {
      id: 'feed',
      src: '/screenshots/appstore_preview_feed.png',
      alt: 'Team feed — check-ins, stats, and personal records',
    },
    {
      id: 'schedule',
      src: '/screenshots/appstore_preview_schedule.png',
      alt: 'Team schedule — practices and workout planning',
    },
    {
      id: 'profile',
      src: '/screenshots/appstore_preview_profile.png',
      alt: 'Profile — monthly, yearly, and lifetime swim stats',
    },
  ],
}

export function parseHomepageContent(raw: unknown): HomepageContent {
  return homepageContentSchema.parse(raw)
}

export function mergeHomepageContent(
  base: HomepageContent,
  patch: HomepageContentPatch,
): HomepageContent {
  return homepageContentSchema.parse({
    ...base,
    ...patch,
    previews: patch.previews ?? base.previews,
  })
}

export function publicPathForSlug(slug: string): string {
  return slug === HOME_PAGE_SLUG ? '/' : `/p/${slug}`
}

export function slugifyPageTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export function validateNewPageSlug(
  slug: string,
): { ok: true; slug: string } | { ok: false; error: string } {
  const parsed = pageSlugSchema.safeParse(slug.trim().toLowerCase())
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid slug',
    }
  }
  if (RESERVED_PAGE_SLUGS.has(parsed.data)) {
    return {
      ok: false,
      error: `“${parsed.data}” is reserved. Choose a different path.`,
    }
  }
  return { ok: true, slug: parsed.data }
}
