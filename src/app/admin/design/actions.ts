'use server'

import { generateHomepageFromPrompt } from '@/lib/marketing/generate'
import { commitPagePublish } from '@/lib/marketing/github-commit'
import {
  HOME_PAGE_SLUG,
  homepageContentSchema,
  publicPathForSlug,
  slugifyPageTitle,
  type HomepageContent,
} from '@/lib/marketing/homepage-schema'
import {
  MARKETING_PREVIEW_COOKIE,
  marketingPreviewCookieOptions,
} from '@/lib/marketing/preview'
import {
  createMarketingDraft,
  createMarketingPage,
  deleteMarketingDraft,
  deleteMarketingPage,
  getMarketingDraft,
  getPublishedHomepage,
  getPublishedPage,
  isPageLive,
  listMarketingDrafts,
  listPublishedPages,
  publishMarketingDraft,
  updateMarketingDraft,
  type MarketingDraft,
  type PublishedMarketingPage,
} from '@/lib/marketing/store'
import { requireStaff } from '@/supabase/auth'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export type DesignActionResult<T = undefined> =
  | (T extends undefined ? { success: true } : { success: true; data: T })
  | { error: string }

function staffLabel(firstName: string, lastName: string, email: string) {
  const name = `${firstName} ${lastName}`.trim()
  return name || email
}

export async function listDesignPagesAction(): Promise<
  DesignActionResult<PublishedMarketingPage[]>
> {
  await requireStaff()
  return { success: true, data: await listPublishedPages() }
}

export async function listDesignDraftsAction(
  pageSlug?: string,
): Promise<DesignActionResult<MarketingDraft[]>> {
  await requireStaff()
  const drafts = await listMarketingDrafts(pageSlug)
  return { success: true, data: drafts }
}

export async function getPublishedContentAction(): Promise<
  DesignActionResult<HomepageContent>
> {
  await requireStaff()
  const content = await getPublishedHomepage()
  return { success: true, data: content }
}

export async function createDesignDraftAction(input?: {
  name?: string
  pageSlug?: string
  content?: HomepageContent
}): Promise<DesignActionResult<MarketingDraft>> {
  const staff = await requireStaff()
  const pageSlug = input?.pageSlug || HOME_PAGE_SLUG
  const draft = await createMarketingDraft({
    name: input?.name?.trim() || `Draft ${new Date().toLocaleString()}`,
    pageSlug,
    content: input?.content,
    createdBy: staffLabel(staff.firstName, staff.lastName, staff.email),
  })
  return { success: true, data: draft }
}

export async function createDesignPageAction(input: {
  title: string
  slug?: string
}): Promise<
  DesignActionResult<{ draft: MarketingDraft; page: PublishedMarketingPage }>
> {
  const staff = await requireStaff()
  const title = input.title.trim()
  if (!title) return { error: 'Enter a page title.' }

  const slug = (input.slug?.trim() || slugifyPageTitle(title)).toLowerCase()
  const result = await createMarketingPage({
    slug,
    title,
    createdBy: staffLabel(staff.firstName, staff.lastName, staff.email),
  })
  if ('error' in result) return { error: result.error }
  return { success: true, data: result }
}

export async function deleteDesignPageAction(
  slug: string,
): Promise<DesignActionResult> {
  await requireStaff()
  const result = await deleteMarketingPage(slug)
  if ('error' in result) return { error: result.error }
  revalidatePath('/admin/design')
  revalidatePath(publicPathForSlug(slug))
  return { success: true }
}

export async function saveDesignDraftAction(input: {
  id: string
  name?: string
  content: HomepageContent
}): Promise<DesignActionResult<MarketingDraft>> {
  await requireStaff()
  const parsed = homepageContentSchema.safeParse(input.content)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid content' }
  }
  const draft = await updateMarketingDraft(input.id, {
    name: input.name,
    content: parsed.data,
    status: 'draft',
  })
  if (!draft) return { error: 'Draft not found' }
  return { success: true, data: draft }
}

export async function applyDesignPromptAction(input: {
  draftId: string
  prompt: string
  /** Optional working content; defaults to draft content */
  content?: HomepageContent
}): Promise<
  DesignActionResult<{
    content: HomepageContent
    draft: MarketingDraft
    source: 'ai' | 'heuristic'
    note?: string
  }>
> {
  await requireStaff()
  const draft = await getMarketingDraft(input.draftId)
  if (!draft) return { error: 'Draft not found' }

  const base = input.content
    ? homepageContentSchema.parse(input.content)
    : draft.content

  const result = await generateHomepageFromPrompt(base, input.prompt)
  if ('error' in result) return { error: result.error }

  const updated = await updateMarketingDraft(input.draftId, {
    content: result.content,
    promptHistory: [
      ...draft.promptHistory,
      {
        prompt: input.prompt.trim(),
        at: new Date().toISOString(),
        source: result.source,
      },
    ],
    status: 'draft',
  })
  if (!updated) return { error: 'Failed to update draft' }

  return {
    success: true,
    data: {
      content: result.content,
      draft: updated,
      source: result.source,
      note: result.note,
    },
  }
}

export async function enableDesignPreviewAction(
  draftId: string,
): Promise<DesignActionResult<{ previewPath: string }>> {
  await requireStaff()
  const draft = await getMarketingDraft(draftId)
  if (!draft) return { error: 'Draft not found' }

  cookies().set(
    MARKETING_PREVIEW_COOKIE,
    draftId,
    marketingPreviewCookieOptions(process.env.VERCEL === '1'),
  )
  const base = publicPathForSlug(draft.pageSlug)
  return {
    success: true,
    data: { previewPath: `${base}?preview=${encodeURIComponent(draftId)}` },
  }
}

export async function clearDesignPreviewAction(): Promise<DesignActionResult> {
  await requireStaff()
  cookies().set(MARKETING_PREVIEW_COOKIE, '', {
    ...marketingPreviewCookieOptions(process.env.VERCEL === '1'),
    maxAge: 0,
  })
  return { success: true }
}

export async function deleteDesignDraftAction(
  id: string,
): Promise<DesignActionResult> {
  await requireStaff()
  const cookie = cookies().get(MARKETING_PREVIEW_COOKIE)?.value
  if (cookie === id) {
    cookies().set(MARKETING_PREVIEW_COOKIE, '', {
      ...marketingPreviewCookieOptions(process.env.VERCEL === '1'),
      maxAge: 0,
    })
  }
  const ok = await deleteMarketingDraft(id)
  if (!ok) return { error: 'Draft not found' }
  return { success: true }
}

export async function commitAndDeployDesignAction(input: {
  draftId: string
  name?: string
  content?: HomepageContent
}): Promise<
  DesignActionResult<{
    draft: MarketingDraft
    page: PublishedMarketingPage
    publicPath: string
    deploy: Awaited<ReturnType<typeof commitPagePublish>>
  }>
> {
  await requireStaff()
  const existing = await getMarketingDraft(input.draftId)
  if (!existing) return { error: 'Draft not found' }

  if (input.content || input.name) {
    const parsed = input.content
      ? homepageContentSchema.safeParse(input.content)
      : { success: true as const, data: existing.content }
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid content' }
    }
    await updateMarketingDraft(input.draftId, {
      name: input.name,
      content: parsed.data,
    })
  }

  const published = await publishMarketingDraft(input.draftId)
  if (!published) return { error: 'Failed to publish draft' }

  const deploy = await commitPagePublish(
    published.page,
    `marketing: publish ${published.page.slug} (${published.draft.name})`,
  )

  if ('error' in deploy) {
    return { error: deploy.error }
  }

  cookies().set(MARKETING_PREVIEW_COOKIE, '', {
    ...marketingPreviewCookieOptions(process.env.VERCEL === '1'),
    maxAge: 0,
  })

  revalidatePath('/')
  revalidatePath(published.publicPath)
  revalidatePath('/admin/design')

  return {
    success: true,
    data: {
      draft: published.draft,
      page: published.page,
      publicPath: published.publicPath,
      deploy,
    },
  }
}

export async function getPageLiveStatusAction(
  slug: string,
): Promise<DesignActionResult<{ live: boolean; path: string }>> {
  await requireStaff()
  const page = await getPublishedPage(slug)
  if (!page) return { error: 'Page not found' }
  return {
    success: true,
    data: {
      live: await isPageLive(slug),
      path: publicPathForSlug(slug),
    },
  }
}
