import { isAdminDemoMode } from '@/lib/admin-demo-server'
import { HOME_PAGE_SLUG } from '@/lib/marketing/homepage-schema'
import {
  getPublishedPageRelativePath,
  type PublishedMarketingPage,
} from '@/lib/marketing/store'

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
 * Persist published page content. In demo mode this is a no-op for git.
 * With GITHUB_TOKEN + repo env, creates a commit that triggers Vercel deploy.
 * Otherwise the file was already written locally by publishMarketingDraft.
 */
export async function commitPagePublish(
  page: PublishedMarketingPage,
  message: string,
): Promise<CommitDeployResult> {
  if (isAdminDemoMode()) {
    return {
      success: true,
      mode: 'demo',
      message:
        'Demo mode — live page updated in this session only. No git commit or deploy.',
    }
  }

  const token = process.env.GITHUB_TOKEN || process.env.MARKETING_GITHUB_TOKEN
  const repoInfo = resolveRepo()
  const filePath = getPublishedPageRelativePath(page.slug)

  if (token && repoInfo) {
    try {
      return await commitViaGitHub({
        token,
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        branch: resolveBranch(),
        page,
        message,
        filePath,
      })
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error'
      return {
        error: `GitHub commit failed: ${detail}. Published file was still written locally if possible.`,
      }
    }
  }

  return {
    success: true,
    mode: 'file',
    message: `Page published and revalidated (${filePath}). Add GITHUB_TOKEN (and optional MARKETING_GITHUB_REPO) to commit & trigger a Vercel deploy from admin.`,
  }
}

/** @deprecated Use commitPagePublish */
export async function commitHomepagePublish(
  content: PublishedMarketingPage['content'],
  message: string,
  pageSlug = HOME_PAGE_SLUG,
) {
  return commitPagePublish(
    {
      slug: pageSlug,
      title: pageSlug === HOME_PAGE_SLUG ? 'Homepage' : pageSlug,
      content,
      patches: [],
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    },
    message,
  )
}

async function commitViaGitHub(input: {
  token: string
  owner: string
  repo: string
  branch: string
  page: PublishedMarketingPage
  message: string
  filePath: string
}): Promise<CommitDeployResult> {
  const { token, owner, repo, branch, page, message, filePath } = input
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

  const payload =
    page.slug === HOME_PAGE_SLUG
      ? { ...page.content, patches: page.patches }
      : {
          title: page.title,
          content: page.content,
          patches: page.patches,
          updatedAt: page.updatedAt,
          publishedAt: page.publishedAt,
        }

  const body = JSON.stringify({
    message,
    content: Buffer.from(`${JSON.stringify(payload, null, 2)}\n`).toString(
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
