import { z } from 'zod'

export const elementPatchSchema = z.object({
  id: z.string().min(1),
  /** Prefer matching `[data-design-id="..."]` when present. */
  designId: z.string().min(1).max(120),
  /** Fallback CSS selector snapshot from selection time. */
  selector: z.string().min(1).max(500),
  tagName: z.string().min(1).max(40),
  mode: z.enum(['text', 'html']),
  value: z.string().max(20000),
  previousValue: z.string().max(20000),
  label: z.string().max(200).optional(),
  updatedAt: z.string(),
})

export type ElementPatch = z.infer<typeof elementPatchSchema>

export type ElementSelection = {
  designId: string
  selector: string
  tagName: string
  textContent: string
  outerHTML: string
  label: string
}

export type ElementPromptEntry = {
  prompt: string
  at: string
  source: 'ai' | 'heuristic' | 'manual'
  designId: string
}

export function parseElementPatches(raw: unknown): ElementPatch[] {
  if (!Array.isArray(raw)) return []
  const out: ElementPatch[] = []
  for (const item of raw) {
    const parsed = elementPatchSchema.safeParse(item)
    if (parsed.success) out.push(parsed.data)
  }
  return out
}

export function upsertPatch(
  patches: ElementPatch[],
  next: ElementPatch,
): ElementPatch[] {
  const without = patches.filter(
    (p) => p.designId !== next.designId && p.id !== next.id,
  )
  return [...without, next]
}

export function removePatch(
  patches: ElementPatch[],
  designId: string,
): ElementPatch[] {
  return patches.filter((p) => p.designId !== designId)
}

/** Build a reasonably stable CSS path for an element. */
export function cssPathFromParts(
  parts: { tag: string; nth: number; id?: string; designId?: string }[],
): string {
  return parts
    .map((part) => {
      if (part.designId) return `[data-design-id="${part.designId}"]`
      if (part.id) return `${part.tag}#${CSS.escape?.(part.id) ?? part.id}`
      return `${part.tag}:nth-of-type(${part.nth})`
    })
    .join(' > ')
}

export function shortElementLabel(selection: {
  tagName: string
  textContent: string
  label?: string
}): string {
  if (selection.label?.trim()) return selection.label.trim()
  const text = selection.textContent.replace(/\s+/g, ' ').trim()
  const clipped = text.length > 48 ? `${text.slice(0, 45)}…` : text
  return clipped
    ? `<${selection.tagName.toLowerCase()}> ${clipped}`
    : `<${selection.tagName.toLowerCase()}>`
}
