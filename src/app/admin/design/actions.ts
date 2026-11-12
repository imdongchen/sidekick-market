'use server'

import { generateElementEdit } from '@/lib/marketing/generate-element'
import { commitPagePublish } from '@/lib/marketing/github-commit'
import {
  HOME_PAGE_SLUG,
  homepageContentSchema,
  publicPathForSlug,
  slugifyPageTitle,
  type HomepageContent,
} from '@/lib/marketing/homepage-schema'
import {
  shortElementLabel,
  upsertPatch,
  type ElementPatch,
  type ElementSelection,
} from '@/lib/marketing/patches'
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
  upsertMarketingDraft,
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

/** Rehydrate a draft onto this serverless instance from the browser snapshot. */
async function resolveDraft(
  draftId: string,
  snapshot?: MarketingDraft | null,
): Promise<MarketingDraft | null> {
  const existing = await getMarketingDraft(draftId)
  if (existing) return existing
  if (snapshot && snapshot.id === draftId) {
    return upsertMarketingDraft(snapshot)
  }
  return null
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
  try {
    const staff = await requireStaff()
    const pageSlug = input?.pageSlug || HOME_PAGE_SLUG
    const draft = await createMarketingDraft({
      name: input?.name?.trim() || `Draft ${new Date().toLocaleString()}`,
      pageSlug,
      content: input?.content,
      createdBy: staffLabel(staff.firstName, staff.lastName, staff.email),
    })
    return { success: true, data: draft }
  } catch (err) {
    console.error('[createDesignDraftAction]', err)
    return {
      error:
        err instanceof Error
          ? `Could not create draft: ${err.message}`
          : 'Could not create draft. Try again.',
    }
  }
}

export async function createDesignPageAction(input: {
  title: string
  slug?: string
}): Promise<
  DesignActionResult<{ draft: MarketingDraft; page: PublishedMarketingPage }>
> {
  try {
    const staff = await requireStaff()
    const title = input.title.trim()
    if (!title) return { error: 'Enter a page title.' }

    const slug = (input.slug?.trim() || slugifyPageTitle(title)).toLowerCase()
    if (!slug) {
      return {
        error:
          'Could not build a URL slug from that title. Enter a slug like “summer-camp”.',
      }
    }

    const result = await createMarketingPage({
      slug,
      title,
      createdBy: staffLabel(staff.firstName, staff.lastName, staff.email),
    })
    if ('error' in result) return { error: result.error }
    return { success: true, data: result }
  } catch (err) {
    console.error('[createDesignPageAction]', err)
    return {
      error:
        err instanceof Error
          ? `Could not create page: ${err.message}`
          : 'Could not create page. Try again.',
    }
  }
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
  content?: HomepageContent
  patches?: ElementPatch[]
  draftSnapshot?: MarketingDraft | null
}): Promise<DesignActionResult<MarketingDraft>> {
  await requireStaff()
  if (input.content) {
    const parsed = homepageContentSchema.safeParse(input.content)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid content' }
    }
  }
  const draft = await updateMarketingDraft(
    input.id,
    {
      name: input.name,
      content: input.content,
      patches: input.patches,
      status: 'draft',
    },
    input.draftSnapshot,
  )
  if (!draft) return { error: 'Draft not found' }
  return { success: true, data: draft }
}

export async function applyElementPromptAction(input: {
  draftId: string
  prompt: string
  selection: ElementSelection
  /** Browser-held draft — required on Vercel where instances do not share memory. */
  draftSnapshot?: MarketingDraft | null
}): Promise<
  DesignActionResult<{
    draft: MarketingDraft
    patch: ElementPatch
    source: 'ai' | 'heuristic'
    note?: string
  }>
> {
  try {
    await requireStaff()
    const draft = await resolveDraft(input.draftId, input.draftSnapshot)
    if (!draft) {
      return {
        error:
          'Draft not found on this server instance. Create or select a draft again, then retry the prompt.',
      }
    }

    const result = await generateElementEdit(input.selection, input.prompt)
    if ('error' in result) return { error: result.error }

    const now = new Date().toISOString()
    const patch: ElementPatch = {
      id: `patch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      designId: input.selection.designId,
      selector: input.selection.selector,
      tagName: input.selection.tagName,
      mode: result.mode,
      value: result.value,
      previousValue: input.selection.textContent,
      label: shortElementLabel(input.selection),
      updatedAt: now,
    }

    const updated = await updateMarketingDraft(
      input.draftId,
      {
        patches: upsertPatch(draft.patches, patch),
        promptHistory: [
          ...draft.promptHistory,
          {
            prompt: input.prompt.trim(),
            at: now,
            source: result.source,
            designId: input.selection.designId,
          },
        ],
        status: 'draft',
      },
      draft,
    )
    if (!updated) return { error: 'Failed to update draft' }

    return {
      success: true,
      data: {
        draft: updated,
        patch,
        source: result.source,
        note: result.note,
      },
    }
  } catch (err) {
    console.error('[applyElementPromptAction]', err)
    return {
      error:
        err instanceof Error
          ? `Could not apply prompt: ${err.message}`
          : 'Could not apply prompt. Try again.',
    }
  }
}

export async function removeElementPatchAction(input: {
  draftId: string
  designId: string
  draftSnapshot?: MarketingDraft | null
}): Promise<DesignActionResult<MarketingDraft>> {
  await requireStaff()
  const draft = await resolveDraft(input.draftId, input.draftSnapshot)
  if (!draft) return { error: 'Draft not found' }
  const updated = await updateMarketingDraft(
    input.draftId,
    {
      patches: draft.patches.filter((p) => p.designId !== input.designId),
      status: 'draft',
    },
    draft,
  )
  if (!updated) return { error: 'Failed to update draft' }
  return { success: true, data: updated }
}

export async function enableDesignPreviewAction(
  draftId: string,
  draftSnapshot?: MarketingDraft | null,
): Promise<DesignActionResult<{ previewPath: string }>> {
  await requireStaff()
  const draft = await resolveDraft(draftId, draftSnapshot)
  if (!draft) return { error: 'Draft not found' }

  cookies().set(
    MARKETING_PREVIEW_COOKIE,
    draftId,
    marketingPreviewCookieOptions(process.env.VERCEL === '1'),
  )
  const base = publicPathForSlug(draft.pageSlug)
  return {
    success: true,
    data: {
      previewPath: `${base}?preview=${encodeURIComponent(draftId)}&designSelect=1`,
    },
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
  patches?: ElementPatch[]
  draftSnapshot?: MarketingDraft | null
}): Promise<
  DesignActionResult<{
    draft: MarketingDraft
    page: PublishedMarketingPage
    publicPath: string
    deploy: Awaited<ReturnType<typeof commitPagePublish>>
  }>
> {
  await requireStaff()
  const existing = await resolveDraft(input.draftId, input.draftSnapshot)
  if (!existing) return { error: 'Draft not found' }

  if (input.name || input.patches) {
    await updateMarketingDraft(
      input.draftId,
      {
        name: input.name,
        patches: input.patches,
      },
      existing,
    )
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
