import { HomepageView } from '@/components/marketing/homepage-view'
import { HOME_PAGE_SLUG } from '@/lib/marketing/homepage-schema'
import { resolvePreviewDraftId } from '@/lib/marketing/resolve-preview'
import {
  getMarketingDraft,
  getPublishedHomepage,
} from '@/lib/marketing/store'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: { preview?: string }
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const content = await getPublishedHomepage()
  const previewId = await resolvePreviewDraftId(searchParams, HOME_PAGE_SLUG)
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
  const previewId = await resolvePreviewDraftId(searchParams, HOME_PAGE_SLUG)
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
