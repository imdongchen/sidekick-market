'use client'

import type { ElementPatch } from '@/lib/marketing/patches'
import { useEffect, useState } from 'react'

export const DESIGN_PATCHES_MESSAGE = 'sidekick-design-patches'

function findTarget(patch: ElementPatch): Element | null {
  const byId = document.querySelector(`[data-design-id="${patch.designId}"]`)
  if (byId) return byId
  try {
    return document.querySelector(patch.selector)
  } catch {
    return null
  }
}

function applyOne(patch: ElementPatch) {
  const el = findTarget(patch)
  if (!el) return
  if (!el.getAttribute('data-design-id')) {
    el.setAttribute('data-design-id', patch.designId)
  }
  if (patch.mode === 'html') {
    el.innerHTML = patch.value
  } else {
    el.textContent = patch.value
  }
}

function applyAll(patches: ElementPatch[]) {
  for (const patch of patches) applyOne(patch)
}

/**
 * Applies element patches after React paints. Also accepts live patch pushes
 * from the Design mode parent frame (needed on Vercel where draft lookup
 * often misses across serverless instances).
 */
export function PatchApplier({ patches }: { patches: ElementPatch[] }) {
  const [livePatches, setLivePatches] = useState<ElementPatch[] | null>(null)
  const effective = livePatches ?? patches

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      const data = event.data as { type?: string; patches?: ElementPatch[] }
      if (data?.type !== DESIGN_PATCHES_MESSAGE) return
      if (!Array.isArray(data.patches)) return
      setLivePatches(data.patches)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    if (!effective.length) return

    const run = () => applyAll(effective)
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
