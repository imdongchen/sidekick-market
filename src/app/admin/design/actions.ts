'use server'

import { isAdminDemoMode } from '@/lib/admin-demo-server'
import { generateHomepageFromPrompt } from '@/lib/marketing/generate'
import { commitHomepagePublish } from '@/lib/marketing/github-commit'
import {
  homepageContentSchema,
  type HomepageContent,
} from '@/lib/marketing/homepage-schema'
import {
  MARKETING_PREVIEW_COOKIE,
  marketingPreviewCookieOptions,
} from '@/lib/marketing/preview'
import {
  createMarketingDraft,
  deleteMarketingDraft,
  getMarketingDraft,
  getPublishedHomepage,
  listMarketingDrafts,
  publishMarketingDraft,
  updateMarketingDraft,
  type MarketingDraft,
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

export async function listDesignDraftsAction(): Promise<
  DesignActionResult<MarketingDraft[]>
> {
  await requireStaff()
  const drafts = await listMarketingDrafts()
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
}): Promise<DesignActionResult<MarketingDraft>> {
  const staff = await requireStaff()
  const draft = await createMarketingDraft({
    name: input?.name?.trim() || `Draft ${new Date().toLocaleString()}`,
    createdBy: staffLabel(staff.firstName, staff.lastName, staff.email),
  })
  revalidatePath('/admin/design')
  return { success: true, data: draft }
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
  revalidatePath('/admin/design')
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

  revalidatePath('/admin/design')
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
  return { success: true, data: { previewPath: '/' } }
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
  revalidatePath('/admin/design')
  return { success: true }
}

export async function commitAndDeployDesignAction(input: {
  draftId: string
  name?: string
  content?: HomepageContent
}): Promise<
  DesignActionResult<{
    draft: MarketingDraft
    deploy: Awaited<ReturnType<typeof commitHomepagePublish>>
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

  const deploy = await commitHomepagePublish(
    published.content,
    `marketing: publish homepage (${published.draft.name})`,
  )

  if ('error' in deploy) {
    return { error: deploy.error }
  }

  // Clear preview so public sees live content
  cookies().set(MARKETING_PREVIEW_COOKIE, '', {
    ...marketingPreviewCookieOptions(process.env.VERCEL === '1'),
    maxAge: 0,
  })

  revalidatePath('/')
  revalidatePath('/admin/design')

  const demo = isAdminDemoMode()
  return {
    success: true,
    data: {
      draft: published.draft,
      deploy: {
        ...deploy,
        message: demo
          ? deploy.message
          : deploy.message,
      },
    },
  }
}
