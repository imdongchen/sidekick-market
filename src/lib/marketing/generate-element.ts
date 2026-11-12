import type { ElementSelection } from '@/lib/marketing/patches'
import { generateText, Output } from 'ai'
import { z } from 'zod'

function aiConfigured(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.OPENAI_API_KEY,
  )
}

function extractQuoted(prompt: string): string[] {
  const matches = [...prompt.matchAll(/["“]([^"”]+)["”]/g)]
  return matches.map((m) => m[1].trim()).filter(Boolean)
}

export type ElementEditResult =
  | {
      mode: 'text' | 'html'
      value: string
      source: 'ai' | 'heuristic'
      note?: string
    }
  | { error: string }

/** Deterministic local edit when AI is unavailable. */
export function applyElementHeuristic(
  selection: ElementSelection,
  prompt: string,
): ElementEditResult {
  const text = prompt.trim()
  if (!text) return { error: 'Enter a prompt describing the change.' }

  const quoted = extractQuoted(text)
  const lower = text.toLowerCase()
  const isVoid = /^(img|br|hr|input|svg|path|source)$/i.test(selection.tagName)

  if (isVoid) {
    // Attribute-ish: if prompt has quoted alt/text, ignore for now
    if (quoted[0] && selection.tagName.toLowerCase() === 'img') {
      return {
        mode: 'html',
        value: selection.outerHTML.replace(
          /alt="[^"]*"/i,
          `alt="${quoted[0].replace(/"/g, '&quot;')}"`,
        ),
        source: 'heuristic',
        note: 'Updated image alt text locally (AI gateway not configured).',
      }
    }
    return {
      error:
        'This element has no text content to edit with the local editor. Configure AI_GATEWAY_API_KEY for richer edits.',
    }
  }

  let next = selection.textContent
  if (quoted[0]) {
    next = quoted[0]
  } else if (lower.startsWith('change') || lower.startsWith('set')) {
    const to = text.match(/\bto\s+(.+)$/i)
    next = to?.[1]?.replace(/^["'“]|["'”]$/g, '').trim() || text
  } else if (lower.includes('shorter') || lower.includes('concise')) {
    next = selection.textContent.split(/[.!?]/)[0]?.trim() || selection.textContent
  } else if (text.length <= 200) {
    next = text.replace(/^["'“]|["'”]$/g, '')
  } else {
    next = text.slice(0, 400)
  }

  return {
    mode: 'text',
    value: next,
    source: 'heuristic',
    note: 'AI gateway is not configured — applied a local heuristic edit to the selected element.',
  }
}

export async function generateElementEdit(
  selection: ElementSelection,
  prompt: string,
): Promise<ElementEditResult> {
  const trimmed = prompt.trim()
  if (!trimmed) return { error: 'Enter a prompt describing the change.' }

  if (!aiConfigured()) {
    return applyElementHeuristic(selection, trimmed)
  }

  try {
    const { output } = await generateText({
      model: 'openai/gpt-5.4',
      output: Output.object({
        schema: z.object({
          mode: z
            .enum(['text', 'html'])
            .describe(
              'Use text to replace textContent; html only when structure must change',
            ),
          value: z
            .string()
            .max(20000)
            .describe('Replacement text or HTML for the selected element'),
          summary: z.string().max(240),
        }),
      }),
      system: `You edit a single selected HTML element on the Sidekick marketing site.
Only change that element. Prefer mode "text" (plain textContent) unless the user asks for markup.
Keep Sidekick brand voice: confident, athletic, clear. No emojis.
Do not wrap text in extra quotes. Do not invent image URLs.`,
      prompt: `Selected element:
tag: ${selection.tagName}
label: ${selection.label}
current text: ${JSON.stringify(selection.textContent)}
outerHTML: ${selection.outerHTML.slice(0, 4000)}

Staff request:
${trimmed}

Return the replacement for this element only.`,
    })

    if (!output?.value) {
      return applyElementHeuristic(selection, trimmed)
    }

    return {
      mode: output.mode,
      value: output.value,
      source: 'ai',
      note: output.summary,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown AI error'
    const fallback = applyElementHeuristic(selection, trimmed)
    if ('error' in fallback) {
      return { error: `AI request failed (${message}). ${fallback.error}` }
    }
    return {
      ...fallback,
      note: `AI request failed (${message}). Applied a local heuristic edit instead.`,
    }
  }
}
