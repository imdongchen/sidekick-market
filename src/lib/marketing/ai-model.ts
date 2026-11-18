import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'

/**
 * Design-mode AI routing:
 * - OPENAI_API_KEY → call OpenAI directly (no Vercel AI Gateway)
 * - else AI_GATEWAY_API_KEY / VERCEL_OIDC_TOKEN → Vercel AI Gateway
 */
export function isDesignAiConfigured(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY ||
      process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN,
  )
}

export function getDesignModel(): LanguageModel | string | null {
  const openAiKey = process.env.OPENAI_API_KEY?.trim()
  if (openAiKey) {
    const openai = createOpenAI({ apiKey: openAiKey })
    return openai(process.env.OPENAI_MODEL?.trim() || 'gpt-4o')
  }

  if (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) {
    return process.env.AI_GATEWAY_MODEL?.trim() || 'openai/gpt-4o'
  }

  return null
}
