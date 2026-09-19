import { DesignMode } from '@/components/admin/design-mode'
import {
  getPublishedHomepage,
  listMarketingDrafts,
} from '@/lib/marketing/store'
import { requireStaff } from '@/supabase/auth'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Design mode',
}

export default async function AdminDesignPage() {
  await requireStaff()
  const [drafts, published] = await Promise.all([
    listMarketingDrafts(),
    getPublishedHomepage(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
        Design mode
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-zinc-600">
        Prompt changes to the marketing homepage, preview them live, save a
        draft, then commit and deploy when you are ready.
      </p>
      <div className="mt-8">
        <DesignMode initialDrafts={drafts} published={published} />
      </div>
    </div>
  )
}
