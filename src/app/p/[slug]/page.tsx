import { HomepageView } from '@/components/marketing/homepage-view'
import { HOME_PAGE_SLUG } from '@/lib/marketing/homepage-schema'
import { resolvePreviewDraftId } from '@/lib/marketing/resolve-preview'
import {
  getMarketingDraft,
  getPublishedPage,
  isPageLive,
} from '@/lib/marketing/store'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = {
  params: { slug: string }
  searchParams: { preview?: string }
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const slug = params.slug
  if (slug === HOME_PAGE_SLUG) return {}

  const previewId = await resolvePreviewDraftId(searchParams, slug)
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

  const page = await getPublishedPage(slug)
  if (!page || !(await isPageLive(slug))) return { title: 'Not found' }
  return {
    description: page.content.metaDescription,
    title: page.title,
  }
}

export default async function MarketingPage({ params, searchParams }: Props) {
  const slug = params.slug
  if (slug === HOME_PAGE_SLUG) notFound()

  const previewId = await resolvePreviewDraftId(searchParams, slug)
  if (previewId) {
    const draft = await getMarketingDraft(previewId)
    if (draft && draft.pageSlug === slug) {
      return (
        <HomepageView
          content={draft.content}
          previewBanner={`Design preview — draft “${draft.name}”. Live visitors still see the published page.`}
        />
      )
    }
  }

  const page = await getPublishedPage(slug)
  if (!page || !(await isPageLive(slug))) notFound()

  return <HomepageView content={page.content} />
}
