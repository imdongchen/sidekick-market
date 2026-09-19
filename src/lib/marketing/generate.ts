import {
  homepageContentPatchSchema,
  mergeHomepageContent,
  type HomepageContent,
} from '@/lib/marketing/homepage-schema'
import { generateText, Output } from 'ai'
import { z } from 'zod'

const SYSTEM = `You are a brand copywriter for Sidekick, a swim-team mobile app.
Edit the marketing homepage copy. Keep the brand name "Sidekick" unless the user explicitly asks to rename it.
Preserve existing screenshot preview image paths (src) unless the user asks to change alts only.
Tone: confident, athletic, clear — not hypey or corporate. No emojis.
Return only fields you want to change; omit unchanged fields.
Do not invent new screenshot image URLs.`

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

  if (!aiConfigured()) {
    return {
      content: applyHeuristicPrompt(current, trimmed),
      source: 'heuristic',
      note: 'AI gateway is not configured — applied a local heuristic edit. Set AI_GATEWAY_API_KEY for model-powered prompts.',
    }
  }

  try {
    const { output } = await generateText({
      model: 'openai/gpt-5.4',
      output: Output.object({
        schema: z.object({
          patch: homepageContentPatchSchema,
          summary: z
            .string()
            .max(240)
            .describe('One sentence describing what changed'),
        }),
      }),
      system: SYSTEM,
      prompt: `Current homepage JSON:\n${JSON.stringify(current, null, 2)}\n\nStaff request:\n${trimmed}\n\nReturn a patch of fields to update.`,
    })

    if (!output?.patch) {
      return {
        content: applyHeuristicPrompt(current, trimmed),
        source: 'heuristic',
        note: 'Model returned no patch — fell back to heuristic edit.',
      }
    }

    return {
      content: mergeHomepageContent(current, output.patch),
      source: 'ai',
      note: output.summary,
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
