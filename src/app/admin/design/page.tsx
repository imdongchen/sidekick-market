import { DesignMode } from '@/components/admin/design-mode'
import {
  listMarketingDrafts,
  listPublishedPages,
} from '@/lib/marketing/store'
import { requireStaff } from '@/supabase/auth'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Design mode',
}

export default async function AdminDesignPage() {
  await requireStaff()
  const [pages, drafts] = await Promise.all([
    listPublishedPages(),
    listMarketingDrafts(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
        Design mode
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-zinc-600">
        Click any element in the live preview, prompt a change, save a draft,
        then commit and deploy. Works across different page structures.
      </p>
      <div className="mt-8">
        <DesignMode initialPages={pages} initialDrafts={drafts} />
      </div>
    </div>
  )
}
