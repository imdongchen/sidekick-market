'use client'

import type { HomepageContent } from '@/lib/marketing/homepage-schema'
import { useEffect, useState } from 'react'

export const DESIGN_CONTENT_MESSAGE = 'sidekick-design-content'

/** Maps structured homepage fields → data-design-id nodes in HomepageView. */
const FIELD_TO_DESIGN_ID: Partial<Record<keyof HomepageContent, string>> = {
  brand: 'brand',
  tagline: 'tagline',
  body: 'body',
  androidNote: 'android-note',
  contactPrompt: 'contact-prompt',
  contactEmail: 'contact-email',
  adminLoginLabel: 'admin-login-label',
}

export function applyHomepageContentToDom(content: HomepageContent) {
  for (const [field, designId] of Object.entries(FIELD_TO_DESIGN_ID)) {
    const value = content[field as keyof HomepageContent]
    if (typeof value !== 'string') continue
    const el = document.querySelector(`[data-design-id="${designId}"]`)
    if (el) el.textContent = value
  }

  for (const preview of content.previews) {
    const figure = document.querySelector(
      `[data-design-id="preview-${preview.id}"]`,
    )
    const img = figure?.querySelector('img')
    if (img) {
      img.alt = preview.alt
      if (preview.src) img.src = preview.src
    }
  }

  const hasCopy = Boolean(
    content.brand.trim() ||
      content.tagline.trim() ||
      content.body.trim() ||
      content.androidNote.trim() ||
      content.contactPrompt.trim() ||
      content.contactEmail.trim() ||
      content.adminLoginLabel.trim() ||
      content.previews.length,
  )
  if (hasCopy) {
    document
      .querySelectorAll('[data-empty-page-hint="1"]')
      .forEach((el) => el.remove())
  }
}

/**
 * Live content sync from Design mode parent (whole-page prompts on Vercel).
 */
export function ContentApplier({
  content,
}: {
  content?: HomepageContent | null
}) {
  const [live, setLive] = useState<HomepageContent | null>(null)
  const effective = live ?? content ?? null

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      const data = event.data as { type?: string; content?: HomepageContent }
      if (data?.type !== DESIGN_CONTENT_MESSAGE) return
      if (!data.content || typeof data.content !== 'object') return
      setLive(data.content)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    if (!effective) return
    const run = () => applyHomepageContentToDom(effective)
    run()
    const t1 = window.setTimeout(run, 50)
    const t2 = window.setTimeout(run, 300)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [effective])

  return null
}
