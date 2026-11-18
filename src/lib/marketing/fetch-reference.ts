/**
 * Pull readable text from URLs mentioned in Design prompts so the model can
 * adapt reference pages (e.g. swim-team fundraising pages) into Sidekick copy.
 */

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi

export function extractHttpUrls(text: string): string[] {
  const matches = text.match(URL_RE) ?? []
  const cleaned = matches.map((raw) =>
    raw.replace(/[.,;:!?)]+$/g, '').trim(),
  )
  return [...new Set(cleaned)].slice(0, 3)
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export async function fetchReferencePageText(
  url: string,
  opts?: { maxChars?: number; timeoutMs?: number },
): Promise<{ url: string; text: string } | { url: string; error: string }> {
  const maxChars = opts?.maxChars ?? 12000
  const timeoutMs = opts?.timeoutMs ?? 8000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'SidekickDesignMode/1.0 (+https://sidekickswim.com)',
      },
    })
    if (!res.ok) {
      return { url, error: `HTTP ${res.status}` }
    }
    const html = await res.text()
    const text = stripHtml(html).slice(0, maxChars)
    if (!text) return { url, error: 'No readable text found' }
    return { url, text }
  } catch (err) {
    return {
      url,
      error: err instanceof Error ? err.message : 'Fetch failed',
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function gatherPromptReferenceContext(
  prompt: string,
): Promise<string | null> {
  const urls = extractHttpUrls(prompt)
  if (!urls.length) return null

  const results = await Promise.all(urls.map((url) => fetchReferencePageText(url)))
  const sections: string[] = []
  for (const result of results) {
    if ('text' in result) {
      sections.push(`Reference page ${result.url}:\n${result.text}`)
    } else {
      sections.push(
        `Reference page ${result.url} could not be fetched (${result.error}). Adapt from the URL/path and staff request only.`,
      )
    }
  }
  return sections.join('\n\n')
}
