'use client'

import type { ElementSelection } from '@/lib/marketing/patches'
import { useEffect } from 'react'

export const DESIGN_SELECT_MESSAGE = 'sidekick-design-select'
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
 * Enables click-to-select on the marketing page when opened inside Design mode.
 * Posts selection details to the parent frame.
 */
export function DesignSelectBridge({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return
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
  }, [enabled])

  return null
}
