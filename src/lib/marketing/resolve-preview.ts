import { isAdminDemoMode } from '@/lib/admin-demo-server'
import { MARKETING_PREVIEW_COOKIE } from '@/lib/marketing/preview'
import { getMarketingDraft } from '@/lib/marketing/store'
import { getStaffProfile } from '@/supabase/auth'
import { cookies } from 'next/headers'

export async function resolvePreviewDraftId(
  searchParams: { preview?: string },
  /** When set, only accept drafts that belong to this page slug. */
  pageSlug?: string,
): Promise<string | null> {
  const cookieId = cookies().get(MARKETING_PREVIEW_COOKIE)?.value ?? null
  const queryId = searchParams.preview?.trim() || null

  async function accept(id: string | null) {
    if (!id) return null
    if (!pageSlug) return id
    const draft = await getMarketingDraft(id)
    if (!draft || draft.pageSlug !== pageSlug) return null
    return id
  }

  if (!queryId) return accept(cookieId)

  const staff = await getStaffProfile()
  if (staff || isAdminDemoMode() || cookieId === queryId) {
    return accept(queryId)
  }

  return accept(cookieId)
}
