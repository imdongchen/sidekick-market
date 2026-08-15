/**
 * PostHog Query API helpers for member usage metrics.
 *
 * Only import this module from server code that stays private
 * (e.g. `/api/admin/engagement`). `POSTHOG_API_KEY` must be set in the host
 * environment or `.env.local` — never commit it.
 *
 * Public project settings (host / project id) may live in `.env`.
 */

export type PostHogWeeklyUsage = {
  sessions: number
  hours: number
}

function normalizeApiHost(host: string): string {
  const trimmed = host.replace(/\/$/, '')
  // iOS SDKs use the ingest host; the Query API uses the app host.
  if (trimmed.includes('us.i.posthog.com')) return 'https://us.posthog.com'
  if (trimmed.includes('eu.i.posthog.com')) return 'https://eu.posthog.com'
  return trimmed
}

export function getPostHogConfig(): {
  apiKey: string
  projectId: string
  host: string
} | null {
  const apiKey =
    process.env.POSTHOG_API_KEY?.trim() ||
    process.env.POSTHOG_PERSONAL_API_KEY?.trim()
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim()
  if (!apiKey || !projectId) return null

  const rawHost =
    process.env.POSTHOG_HOST?.trim() ||
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
    'https://us.posthog.com'

  return {
    apiKey,
    projectId,
    host: normalizeApiHost(rawHost),
  }
}

export function isPostHogConfigured(): boolean {
  return getPostHogConfig() !== null
}

/**
 * Weekly usage sessions + hours for many distinct_ids (typically profile.userId).
 * Returns null when PostHog is not configured or the query fails; otherwise a map
 * (missing ids imply 0 sessions in the window).
 */
export async function getWeeklyUsageByDistinctIds(
  distinctIds: string[],
): Promise<Map<string, PostHogWeeklyUsage> | null> {
  const unique = [...new Set(distinctIds.filter(Boolean))]
  if (unique.length === 0) return new Map()

  const config = getPostHogConfig()
  if (!config) return null

  // Project API keys (phc_) cannot call the Query API.
  if (config.apiKey.startsWith('phc_')) {
    console.warn(
      'PostHog weekly usage skipped: set POSTHOG_API_KEY to a personal key (phx_…)',
    )
    return null
  }

  const result = new Map<string, PostHogWeeklyUsage>()
  let anySuccess = false

  // Chunk to keep HogQL IN lists reasonable.
  const chunkSize = 100
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const chunkMap = await queryWeeklyUsageChunk(config, chunk)
    if (chunkMap === null) continue
    anySuccess = true
    for (const [id, usage] of chunkMap) {
      result.set(id, usage)
    }
  }

  return anySuccess ? result : null
}

async function queryWeeklyUsageChunk(
  config: { apiKey: string; projectId: string; host: string },
  distinctIds: string[],
): Promise<Map<string, PostHogWeeklyUsage> | null> {
  const map = new Map<string, PostHogWeeklyUsage>()
  const escaped = distinctIds.map((id) => `'${id.replace(/'/g, "\\'")}'`)

  // sessions.$session_duration is seconds; convert to hours.
  const query = `
    SELECT
      distinct_id,
      count() AS sessions,
      sum(coalesce($session_duration, 0)) / 3600.0 AS hours
    FROM sessions
    WHERE
      distinct_id IN (${escaped.join(', ')})
      AND $start_timestamp >= now() - INTERVAL 7 DAY
    GROUP BY distinct_id
  `

  try {
    const res = await fetch(
      `${config.host}/api/projects/${config.projectId}/query/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: { kind: 'HogQLQuery', query },
          name: 'member-weekly-usage',
        }),
        next: { revalidate: 300 },
      },
    )

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('PostHog weekly usage query failed', res.status, text)
      return null
    }

    const data = (await res.json()) as {
      results?: Array<[string, number | string, number | string]>
    }

    for (const row of data.results ?? []) {
      const [distinctId, sessions, hours] = row
      if (!distinctId) continue
      map.set(String(distinctId), {
        sessions: Number(sessions) || 0,
        hours: Math.round((Number(hours) || 0) * 10) / 10,
      })
    }
  } catch (err) {
    console.error('PostHog weekly usage query error', err)
    return null
  }

  return map
}
