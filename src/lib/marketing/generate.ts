import {
  getDesignModel,
  isDesignAiConfigured,
} from '@/lib/marketing/ai-model'
import { gatherPromptReferenceContext } from '@/lib/marketing/fetch-reference'
import {
  aiPatchToHomepagePatch,
  homepageContentAiPatchSchema,
  mergeHomepageContent,
  type HomepageContent,
} from '@/lib/marketing/homepage-schema'
import { generateText, Output } from 'ai'
import { z } from 'zod'

const SYSTEM = `You write marketing page copy for Sidekick, a swim-team mobile app.
You edit structured page fields rendered in Sidekick's existing dark athletic layout
(brand headline, tagline, body, optional store CTA, footer contact). You cannot change layout chrome.
Tone: confident, athletic, clear — not hypey or corporate. No emojis.
When the staff request references another page (and reference text is provided), adapt that page's
purpose and key facts into Sidekick's fields while matching Sidekick visual/voice — do not copy logos,
competitor brand names as the page brand, or invent screenshot URLs.
For blank pages (empty brand/tagline/body), fill the fields needed for a complete first draft.
For fundraising/donation pages: put the campaign title in brand or tagline, put the letter + goals +
donation options summary in body (use short paragraphs separated by blank lines), put contact in
contactPrompt/contactEmail, leave appStoreUrl/previews empty ("" / null) unless asked otherwise.
Keep the brand name "Sidekick" only when editing the product homepage; for other marketing pages,
use a page-appropriate title in brand.
For every patch field: set a new string (or preview array) to change it, or null to leave it unchanged.
Do not invent new screenshot image URLs.`

function extractQuoted(prompt: string): string[] {
  const matches = [...prompt.matchAll(/["“]([^"”]+)["”]/g)]
  return matches.map((m) => m[1].trim()).filter(Boolean)
}

/** Deterministic fallback when no AI gateway/key is configured (demo / local). */
export function applyHeuristicPrompt(
  current: HomepageContent,
  prompt: string,
): HomepageContent {
  const text = prompt.trim()
  const lower = text.toLowerCase()
  const quoted = extractQuoted(text)
  let next = { ...current, previews: current.previews.map((p) => ({ ...p })) }

  const fieldSet = (
    field: keyof HomepageContent,
    patterns: RegExp[],
  ): boolean => {
    for (const re of patterns) {
      const m = text.match(re)
      if (m?.[1]) {
        const value = m[1].trim()
        if (field === 'previews') return false
        ;(next as Record<string, unknown>)[field] = value
        return true
      }
    }
    return false
  }

  const touched = [
    fieldSet('brand', [
      /(?:brand|product\s*name)\s*(?:to|:)\s*["']?([^"'\n]+)["']?/i,
    ]),
    fieldSet('tagline', [
      /(?:tagline|headline|subtitle)\s*(?:to|:)\s*["']?([^"'\n]+)["']?/i,
    ]),
    fieldSet('body', [
      /(?:body|description|supporting\s*(?:copy|sentence))\s*(?:to|:)\s*["']?([^"'\n]+)["']?/i,
    ]),
    fieldSet('androidNote', [
      /(?:android(?:\s*note)?)\s*(?:to|:)\s*["']?([^"'\n]+)["']?/i,
    ]),
    fieldSet('contactEmail', [
      /(?:contact\s*email|email)\s*(?:to|:)\s*["']?([^\s"'\n]+@[^\s"'\n]+)["']?/i,
    ]),
    fieldSet('metaDescription', [
      /(?:meta\s*description|seo)\s*(?:to|:)\s*["']?([^"'\n]+)["']?/i,
    ]),
  ].some(Boolean)

  if (!touched) {
    if (quoted.length >= 2) {
      next.tagline = quoted[0]
      next.body = quoted[1]
    } else if (quoted.length === 1) {
      next.tagline = quoted[0]
    } else if (lower.includes('shorter') || lower.includes('concise')) {
      next.body = next.body.split(/[.!?]/)[0]?.trim()
        ? `${next.body.split(/[.!?]/)[0].trim()}.`
        : next.body
      if (next.tagline.split(' ').length > 5) {
        next.tagline = next.tagline.split(' ').slice(0, 4).join(' ')
      }
    } else if (lower.includes('energetic') || lower.includes('bold')) {
      next.tagline = 'Built for teams that show up'
      next.body =
        'Log every set, share the board, and keep the whole squad locked in between practices.'
    } else if (lower.includes('masters')) {
      next.tagline = 'The swim app for masters teams'
      next.body =
        'Track workouts, share the schedule, and keep every masters swimmer in the loop.'
    } else if (text.length > 0 && text.length <= 80) {
      next.tagline = text.replace(/\.$/, '')
    } else if (text.length > 80) {
      next.body = text.slice(0, 280)
    }
  }

  if (lower.includes('coming soon') && lower.includes('android')) {
    next.androidNote = 'Android — coming soon'
  }

  return mergeHomepageContent(current, next)
}

export type GenerateHomepageResult =
  | {
      content: HomepageContent
      source: 'ai' | 'heuristic'
      note?: string
    }
  | { error: string }

export async function generateHomepageFromPrompt(
  current: HomepageContent,
  prompt: string,
): Promise<GenerateHomepageResult> {
  const trimmed = prompt.trim()
  if (!trimmed) {
    return { error: 'Enter a prompt describing the change you want.' }
  }

  const model = getDesignModel()
  if (!isDesignAiConfigured() || !model) {
    return {
      content: applyHeuristicPrompt(current, trimmed),
      source: 'heuristic',
      note: 'No AI model key set — used the local copy editor. Add OPENAI_API_KEY for model-powered prompts.',
    }
  }

  try {
    const referenceContext = await gatherPromptReferenceContext(trimmed)
    const { output } = await generateText({
      model,
      output: Output.object({
        schema: z.object({
          patch: homepageContentAiPatchSchema,
          summary: z
            .string()
            .max(240)
            .describe('One sentence describing what changed'),
        }),
      }),
      system: SYSTEM,
      prompt: `Current page JSON:\n${JSON.stringify(current, null, 2)}\n\nStaff request:\n${trimmed}\n\n${
        referenceContext
          ? `${referenceContext}\n\n`
          : ''
      }Return a patch. Use null for any field you are not changing.`,
    })

    if (!output?.patch) {
      return {
        content: applyHeuristicPrompt(current, trimmed),
        source: 'heuristic',
        note: 'Model returned no patch — fell back to heuristic edit.',
      }
    }

    const patch = aiPatchToHomepagePatch(output.patch)
    if (Object.keys(patch).length === 0) {
      return {
        content: applyHeuristicPrompt(current, trimmed),
        source: 'heuristic',
        note: 'Model returned an empty patch — fell back to heuristic edit.',
      }
    }

    return {
      content: mergeHomepageContent(current, patch),
      source: 'ai',
      note: output.summary
        ? `AI: ${output.summary}`
        : 'AI: Updated page content from your prompt.',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown AI error'
    return {
      content: applyHeuristicPrompt(current, trimmed),
      source: 'heuristic',
      note: `AI request failed (${message}). Applied a local heuristic edit instead.`,
    }
  }
}
