import { HomepageView } from '@/components/marketing/homepage-view'
import { MARKETING_PREVIEW_COOKIE } from '@/lib/marketing/preview'
import {
  getMarketingDraft,
  getPublishedHomepage,
} from '@/lib/marketing/store'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublishedHomepage()
  const previewId = cookies().get(MARKETING_PREVIEW_COOKIE)?.value
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

export default async function Home() {
  const previewId = cookies().get(MARKETING_PREVIEW_COOKIE)?.value
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
