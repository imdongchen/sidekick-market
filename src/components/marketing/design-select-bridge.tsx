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

/**
 * Mounted in Design mode previews. Selection mode starts OFF — the parent
 * frame toggles it via postMessage (`DESIGN_SELECT_MODE_MESSAGE`).
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
      body { cursor: crosshair !important; }
    `
    document.head.appendChild(style)

    const clearHover = () => {
      if (hoverEl) {
        hoverEl.removeAttribute('data-design-hover')
        hoverEl = null
      }
    }

    const onMove = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (target === document.body || target === document.documentElement) return
      if (target.closest('[data-design-ignore]')) return
      clearHover()
      if (target !== selectedEl) {
        hoverEl = target
        hoverEl.setAttribute('data-design-hover', '1')
      }
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (target.closest('[data-design-ignore]')) return
      event.preventDefault()
      event.stopPropagation()

      if (selectedEl) selectedEl.removeAttribute('data-design-selected')
      clearHover()

      const designId = ensureDesignId(target)
      selectedEl = target
      selectedEl.setAttribute('data-design-selected', '1')

      const selection: ElementSelection = {
        designId,
        selector: buildSelector(target),
        tagName: target.tagName.toLowerCase(),
        textContent: (target.innerText || target.textContent || '').trim(),
        outerHTML: target.outerHTML.slice(0, 8000),
        label: readableLabel(target),
      }

      window.parent.postMessage(
        { type: DESIGN_SELECT_MESSAGE, selection },
        window.location.origin,
      )
    }

    document.addEventListener('mousemove', onMove, true)
    document.addEventListener('click', onClick, true)

    return () => {
      document.removeEventListener('mousemove', onMove, true)
      document.removeEventListener('click', onClick, true)
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
      Selection mode on — click an element to select it.
    </div>
  )
}
