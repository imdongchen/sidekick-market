import { isAdminDemoMode } from '@/lib/admin-demo-server'
import type { HomepageContent } from '@/lib/marketing/homepage-schema'
import { getPublishedHomepagePath } from '@/lib/marketing/store'

export type CommitDeployResult =
  | {
      success: true
      mode: 'demo' | 'file' | 'github'
      message: string
      commitUrl?: string
    }
  | { error: string }

function resolveRepo(): { owner: string; repo: string } | null {
  const fromEnv = process.env.MARKETING_GITHUB_REPO // owner/repo
  if (fromEnv?.includes('/')) {
    const [owner, repo] = fromEnv.split('/')
    if (owner && repo) return { owner, repo }
  }
  const owner = process.env.VERCEL_GIT_REPO_OWNER
  const repo = process.env.VERCEL_GIT_REPO_SLUG
  if (owner && repo) return { owner, repo }
  return null
}

function resolveBranch(): string {
  return (
    process.env.MARKETING_GITHUB_BRANCH ||
    process.env.VERCEL_GIT_COMMIT_REF ||
    'main'
  )
}

/**
 * Persist published homepage content. In demo mode this is a no-op for git.
 * With GITHUB_TOKEN + repo env, creates a commit that triggers Vercel deploy.
 * Otherwise writes the content file locally (dev) so revalidate can pick it up.
 */
export async function commitHomepagePublish(
  content: HomepageContent,
  message: string,
): Promise<CommitDeployResult> {
  if (isAdminDemoMode()) {
    return {
      success: true,
      mode: 'demo',
      message:
        'Demo mode — live homepage updated in this session only. No git commit or deploy.',
    }
  }

  const token = process.env.GITHUB_TOKEN || process.env.MARKETING_GITHUB_TOKEN
  const repoInfo = resolveRepo()

  if (token && repoInfo) {
    try {
      const result = await commitViaGitHub({
        token,
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        branch: resolveBranch(),
        content,
        message,
      })
      return result
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error'
      return {
        error: `GitHub commit failed: ${detail}. Published file was still written locally if possible.`,
      }
    }
  }

  // Local / no token: file already written by publishMarketingDraft
  return {
    success: true,
    mode: 'file',
    message:
      'Homepage published and revalidated. Add GITHUB_TOKEN (and optional MARKETING_GITHUB_REPO) to commit & trigger a Vercel deploy from admin.',
  }
}

async function commitViaGitHub(input: {
  token: string
  owner: string
  repo: string
  branch: string
  content: HomepageContent
  message: string
}): Promise<CommitDeployResult> {
  const { token, owner, repo, branch, content, message } = input
  const filePath = 'content/marketing/homepage.json'
  const api = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'sidekick-admin-design-mode',
  }

  let sha: string | undefined
  const existing = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, {
    headers,
    cache: 'no-store',
  })
  if (existing.ok) {
    const body = (await existing.json()) as { sha?: string }
    sha = body.sha
  } else if (existing.status !== 404) {
    const text = await existing.text()
    throw new Error(`Could not read file (${existing.status}): ${text}`)
  }

  const body = JSON.stringify({
    message,
    content: Buffer.from(`${JSON.stringify(content, null, 2)}\n`).toString(
      'base64',
    ),
    branch,
    ...(sha ? { sha } : {}),
  })

  const put = await fetch(api, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body,
  })

  if (!put.ok) {
    const text = await put.text()
    throw new Error(`Commit rejected (${put.status}): ${text}`)
  }

  const putBody = (await put.json()) as {
    commit?: { html_url?: string; sha?: string }
    content?: { html_url?: string }
  }

  return {
    success: true,
    mode: 'github',
    message: `Committed to ${owner}/${repo}@${branch}. Vercel will deploy from this commit.`,
    commitUrl: putBody.commit?.html_url ?? putBody.content?.html_url,
  }
}

export function publishedContentRelativePath() {
  return getPublishedHomepagePath().replace(`${process.cwd()}/`, '')
}
