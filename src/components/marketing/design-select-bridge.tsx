'use client'

import type { ElementSelection } from '@/lib/marketing/patches'
import { useEffect, useState } from 'react'

export const DESIGN_SELECT_MESSAGE = 'sidekick-design-select'
export const DESIGN_SELECT_MODE_MESSAGE = 'sidekick-design-select-mode'
export const DESIGN_SELECT_STYLE_ID = 'sidekick-design-select-style'

function ensureDesignId(el: HTMLElement): string {
  const existing = el.getAttribute('data-design-id')
  if (existing) return existing
  const id = `el_${Math.random().toString(36).slice(2, 10)}`
  el.setAttribute('data-design-id', id)
  return id
}

function nthOfType(el: Element): number {
  const parent = el.parentElement
  if (!parent) return 1
  const tag = el.tagName
  let n = 0
  for (const child of Array.from(parent.children)) {
    if (child.tagName === tag) {
      n += 1
      if (child === el) return n
    }
  }
  return 1
}

function buildSelector(el: HTMLElement): string {
  const designId = el.getAttribute('data-design-id')
  if (designId) return `[data-design-id="${designId}"]`

  const parts: string[] = []
  let node: HTMLElement | null = el
  while (node && node !== document.body && parts.length < 8) {
    const id = node.getAttribute('data-design-id')
    if (id) {
      parts.unshift(`[data-design-id="${id}"]`)
      break
    }
    if (node.id) {
      parts.unshift(`${node.tagName.toLowerCase()}#${node.id}`)
      break
    }
    parts.unshift(
      `${node.tagName.toLowerCase()}:nth-of-type(${nthOfType(node)})`,
    )
    node = node.parentElement
  }
  return parts.join(' > ')
}

function readableLabel(el: HTMLElement): string {
  const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim()
  const clipped = text.length > 48 ? `${text.slice(0, 45)}…` : text
  return clipped
    ? `<${el.tagName.toLowerCase()}> ${clipped}`
    : `<${el.tagName.toLowerCase()}>`
}

function isIgnorable(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return true
  if (el === document.body || el === document.documentElement) return true
  if (el.closest('[data-design-ignore]')) return true
  return false
}

function rectsIntersect(
  a: { left: number; top: number; right: number; bottom: number },
  b: DOMRect,
): boolean {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  )
}

function intersectionArea(
  a: { left: number; top: number; right: number; bottom: number },
  b: DOMRect,
): number {
  const left = Math.max(a.left, b.left)
  const top = Math.max(a.top, b.top)
  const right = Math.min(a.right, b.right)
  const bottom = Math.min(a.bottom, b.bottom)
  const w = right - left
  const h = bottom - top
  return w > 0 && h > 0 ? w * h : 0
}

/** Prefer the smallest element that meaningfully intersects the marquee. */
function pickElementInMarquee(marquee: {
  left: number
  top: number
  right: number
  bottom: number
}): HTMLElement | null {
  const candidates = Array.from(document.body.querySelectorAll('*')).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement &&
      !isIgnorable(el) &&
      el.id !== 'sidekick-design-marquee',
  )

  let best: HTMLElement | null = null
  let bestScore = 0

  for (const el of candidates) {
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    if (!rectsIntersect(marquee, r)) continue
    const overlap = intersectionArea(marquee, r)
    if (overlap < 4) continue
    const area = Math.max(r.width * r.height, 1)
    // Prefer high overlap ratio and smaller elements.
    const score = overlap / area + 1 / Math.sqrt(area)
    if (score > bestScore) {
      bestScore = score
      best = el
    }
  }

  return best
}

function postSelection(el: HTMLElement) {
  const designId = ensureDesignId(el)
  const selection: ElementSelection = {
    designId,
    selector: buildSelector(el),
    tagName: el.tagName.toLowerCase(),
    textContent: (el.innerText || el.textContent || '').trim(),
    outerHTML: el.outerHTML.slice(0, 8000),
    label: readableLabel(el),
  }
  window.parent.postMessage(
    { type: DESIGN_SELECT_MESSAGE, selection },
    window.location.origin,
  )
}

/**
 * Mounted in Design mode previews. Selection mode starts OFF — the parent
 * frame toggles it via postMessage (`DESIGN_SELECT_MODE_MESSAGE`).
 * Supports click and hold-drag (marquee) selection.
 */
export function DesignSelectBridge({ enabled }: { enabled: boolean }) {
  const [selectMode, setSelectMode] = useState(false)

  useEffect(() => {
    if (!enabled) return
    if (window.parent === window) return

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      const data = event.data as { type?: string; active?: boolean }
      if (data?.type !== DESIGN_SELECT_MODE_MESSAGE) return
      setSelectMode(Boolean(data.active))
    }

    window.addEventListener('message', onMessage)
    window.parent.postMessage(
      { type: 'sidekick-design-frame-ready' },
      window.location.origin,
    )
    return () => window.removeEventListener('message', onMessage)
  }, [enabled])

  useEffect(() => {
    if (!enabled || !selectMode) return
    if (window.parent === window) return

    let hoverEl: HTMLElement | null = null
    let selectedEl: HTMLElement | null = null
    let pointerId: number | null = null
    let startX = 0
    let startY = 0
    let dragging = false
    let marquee: HTMLDivElement | null = null
    let downTarget: HTMLElement | null = null

    const style = document.createElement('style')
    style.id = DESIGN_SELECT_STYLE_ID
    style.textContent = `
      [data-design-hover="1"] {
        outline: 2px solid #fbbf24 !important;
        outline-offset: 2px !important;
        cursor: crosshair !important;
      }
      [data-design-selected="1"] {
        outline: 2px solid #34d399 !important;
        outline-offset: 2px !important;
      }
      body { cursor: crosshair !important; user-select: none !important; }
      #sidekick-design-marquee {
        position: fixed;
        z-index: 2147483646;
        pointer-events: none;
        border: 1px solid rgba(52, 211, 153, 0.95);
        background: rgba(52, 211, 153, 0.18);
      }
    `
    document.head.appendChild(style)

    const clearHover = () => {
      if (hoverEl) {
        hoverEl.removeAttribute('data-design-hover')
        hoverEl = null
      }
    }

    const setHover = (el: HTMLElement | null) => {
      clearHover()
      if (!el || el === selectedEl) return
      hoverEl = el
      hoverEl.setAttribute('data-design-hover', '1')
    }

    const commitSelection = (el: HTMLElement) => {
      if (selectedEl) selectedEl.removeAttribute('data-design-selected')
      clearHover()
      selectedEl = el
      selectedEl.setAttribute('data-design-selected', '1')
      postSelection(el)
    }

    const removeMarquee = () => {
      marquee?.remove()
      marquee = null
    }

    const updateMarquee = (x: number, y: number) => {
      const left = Math.min(startX, x)
      const top = Math.min(startY, y)
      const width = Math.abs(x - startX)
      const height = Math.abs(y - startY)
      if (!marquee) {
        marquee = document.createElement('div')
        marquee.id = 'sidekick-design-marquee'
        marquee.setAttribute('data-design-ignore', '1')
        document.body.appendChild(marquee)
      }
      marquee.style.left = `${left}px`
      marquee.style.top = `${top}px`
      marquee.style.width = `${width}px`
      marquee.style.height = `${height}px`

      const pick = pickElementInMarquee({
        left,
        top,
        right: left + width,
        bottom: top + height,
      })
      setHover(pick)
      return pick
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (isIgnorable(target)) return
      event.preventDefault()
      event.stopPropagation()
      pointerId = event.pointerId
      startX = event.clientX
      startY = event.clientY
      dragging = false
      downTarget = target
      try {
        target.setPointerCapture?.(event.pointerId)
      } catch {
        // ignore
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (pointerId === null) {
        // Hover highlight when not dragging
        const target = event.target
        if (!(target instanceof HTMLElement) || isIgnorable(target)) {
          clearHover()
          return
        }
        setHover(target)
        return
      }
      if (event.pointerId !== pointerId) return

      const dist = Math.hypot(event.clientX - startX, event.clientY - startY)
      if (!dragging && dist >= 6) {
        dragging = true
      }
      if (dragging) {
        updateMarquee(event.clientX, event.clientY)
      }
    }

    const onPointerUp = (event: PointerEvent) => {
      if (pointerId === null || event.pointerId !== pointerId) return
      event.preventDefault()
      event.stopPropagation()

      let pick: HTMLElement | null = null
      if (dragging) {
        pick = updateMarquee(event.clientX, event.clientY)
      } else if (downTarget && !isIgnorable(downTarget)) {
        pick = downTarget
      }

      removeMarquee()
      pointerId = null
      dragging = false
      downTarget = null

      if (pick) commitSelection(pick)
    }

    const onPointerCancel = () => {
      removeMarquee()
      pointerId = null
      dragging = false
      downTarget = null
      clearHover()
    }

    // Block native click navigation while select mode is on.
    const onClick = (event: MouseEvent) => {
      if (isIgnorable(event.target as Element)) return
      event.preventDefault()
      event.stopPropagation()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointermove', onPointerMove, true)
    document.addEventListener('pointerup', onPointerUp, true)
    document.addEventListener('pointercancel', onPointerCancel, true)
    document.addEventListener('click', onClick, true)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointermove', onPointerMove, true)
      document.removeEventListener('pointerup', onPointerUp, true)
      document.removeEventListener('pointercancel', onPointerCancel, true)
      document.removeEventListener('click', onClick, true)
      removeMarquee()
      clearHover()
      if (selectedEl) selectedEl.removeAttribute('data-design-selected')
      style.remove()
    }
  }, [enabled, selectMode])

  if (!enabled || !selectMode) return null

  return (
    <div
      data-design-ignore
      className="relative z-20 bg-emerald-700/90 px-4 py-2 text-center text-sm font-medium text-white"
    >
      Selection mode on — click or drag to select an element.
    </div>
  )
}
