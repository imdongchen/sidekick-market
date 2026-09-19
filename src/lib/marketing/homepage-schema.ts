import { z } from 'zod'

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

/** Partial patch the model may return — missing fields keep current values. */
export const homepageContentPatchSchema = homepageContentSchema.partial().extend({
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
