import { HomepageView } from '@/components/marketing/homepage-view'
import { isAdminDemoMode } from '@/lib/admin-demo-server'
import { MARKETING_PREVIEW_COOKIE } from '@/lib/marketing/preview'
import {
  getMarketingDraft,
  getPublishedHomepage,
} from '@/lib/marketing/store'
import { getStaffProfile } from '@/supabase/auth'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: { preview?: string }
}

async function resolvePreviewDraftId(
  searchParams: Props['searchParams'],
): Promise<string | null> {
  const cookieId = cookies().get(MARKETING_PREVIEW_COOKIE)?.value ?? null
  const queryId = searchParams.preview?.trim() || null

  if (!queryId) return cookieId

  // Query-param preview is staff/demo only (iframe + intentional share).
  const staff = await getStaffProfile()
  if (staff || isAdminDemoMode() || cookieId === queryId) {
    return queryId
  }

  return cookieId
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const content = await getPublishedHomepage()
  const previewId = await resolvePreviewDraftId(searchParams)
  if (previewId) {
    const draft = await getMarketingDraft(previewId)
    if (draft) {
      return {
        description: draft.content.metaDescription,
        title: {
          absolute: `${draft.content.brand} (preview)`,
        },
      }
    }
  }
  return {
    description: content.metaDescription,
  }
}

export default async function Home({ searchParams }: Props) {
  const previewId = await resolvePreviewDraftId(searchParams)
  let content = await getPublishedHomepage()
  let previewBanner: string | null = null

  if (previewId) {
    const draft = await getMarketingDraft(previewId)
    if (draft) {
      content = draft.content
      previewBanner = `Design preview — draft “${draft.name}”. Live visitors still see the published page.`
    }
  }

  return <HomepageView content={content} previewBanner={previewBanner} />
}
