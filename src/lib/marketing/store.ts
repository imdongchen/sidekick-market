import {
  DEFAULT_HOMEPAGE_CONTENT,
  HOME_PAGE_SLUG,
  parseHomepageContent,
  publicPathForSlug,
  validateNewPageSlug,
  type HomepageContent,
} from '@/lib/marketing/homepage-schema'
import { promises as fs } from 'fs'
import path from 'path'

export type MarketingDraftStatus = 'draft' | 'published'

export type MarketingPromptEntry = {
  prompt: string
  at: string
  source: 'ai' | 'heuristic' | 'manual'
}

export type MarketingDraft = {
  id: string
  /** Page this draft belongs to (`home` or a custom slug). */
  pageSlug: string
  name: string
  status: MarketingDraftStatus
  content: HomepageContent
  promptHistory: MarketingPromptEntry[]
  createdAt: string
  updatedAt: string
  createdBy: string
  /** Set when this draft was last committed/published to live */
  publishedAt: string | null
}

export type PublishedMarketingPage = {
  slug: string
  title: string
  content: HomepageContent
  updatedAt: string
  publishedAt: string
}

/** Committed content (read-only on Vercel). */
const REPO_CONTENT_DIR = path.join(process.cwd(), 'content', 'marketing')
const HOME_PUBLISHED_PATH = path.join(REPO_CONTENT_DIR, 'homepage.json')
const REPO_PAGES_DIR = path.join(REPO_CONTENT_DIR, 'pages')

/**
 * Writable runtime dir for drafts / unpublished pages.
 * On Vercel the repo FS is read-only — use /tmp. Locally prefer repo drafts/.
 */
function runtimeDataRoot(): string {
  if (process.env.VERCEL || process.env.SIDEKICK_MARKETING_DATA_DIR) {
    return (
      process.env.SIDEKICK_MARKETING_DATA_DIR ||
      path.join('/tmp', 'sidekick-marketing')
    )
  }
  return REPO_CONTENT_DIR
}

function draftsDir() {
  return path.join(runtimeDataRoot(), 'drafts')
}

function runtimePagesDir() {
  return path.join(runtimeDataRoot(), 'pages')
}

type MemoryState = {
  pages: Map<string, PublishedMarketingPage>
  drafts: Map<string, MarketingDraft>
  seeded: boolean
  diskWritable: boolean | null
}

declare global {
  // eslint-disable-next-line no-var
  var __sidekickMarketingStore: MemoryState | undefined
}

function memory(): MemoryState {
  if (!globalThis.__sidekickMarketingStore) {
    globalThis.__sidekickMarketingStore = {
      pages: new Map(),
      drafts: new Map(),
      seeded: false,
      diskWritable: null,
    }
  }
  return globalThis.__sidekickMarketingStore
}

async function ensureRuntimeDirs() {
  await fs.mkdir(draftsDir(), { recursive: true })
  await fs.mkdir(runtimePagesDir(), { recursive: true })
}

async function probeDiskWritable(): Promise<boolean> {
  const state = memory()
  if (state.diskWritable !== null) return state.diskWritable
  try {
    await ensureRuntimeDirs()
    const probe = path.join(draftsDir(), `.write-probe-${process.pid}`)
    await fs.writeFile(probe, 'ok')
    await fs.unlink(probe)
    state.diskWritable = true
  } catch {
    state.diskWritable = false
  }
  return state.diskWritable
}

/** Never throw — marketing edits must work even when the FS is read-only. */
async function safeWriteFile(filePath: string, contents: string) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, contents, 'utf8')
    return true
  } catch (err) {
    console.warn(
      '[marketing-store] write failed (continuing in memory):',
      filePath,
      err instanceof Error ? err.message : err,
    )
    memory().diskWritable = false
    return false
  }
}

function publishedRepoFilePath(slug: string) {
  return slug === HOME_PAGE_SLUG
    ? HOME_PUBLISHED_PATH
    : path.join(REPO_PAGES_DIR, `${slug}.json`)
}

function publishedRuntimeFilePath(slug: string) {
  return slug === HOME_PAGE_SLUG
    ? path.join(runtimeDataRoot(), 'homepage.json')
    : path.join(runtimePagesDir(), `${slug}.json`)
}

function defaultPageTitle(slug: string) {
  if (slug === HOME_PAGE_SLUG) return 'Homepage'
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function pagePayload(page: PublishedMarketingPage) {
  return page.slug === HOME_PAGE_SLUG
    ? page.content
    : {
        title: page.title,
        content: page.content,
        updatedAt: page.updatedAt,
        publishedAt: page.publishedAt,
      }
}

async function readPageJson(
  filePath: string,
  slug: string,
): Promise<PublishedMarketingPage | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as {
      title?: string
      content?: unknown
      updatedAt?: string
      publishedAt?: string
      brand?: string
    }
    const content = parseHomepageContent(
      parsed.content ?? (parsed.brand ? parsed : null) ?? DEFAULT_HOMEPAGE_CONTENT,
    )
    const now = new Date().toISOString()
    return {
      slug,
      title: parsed.title?.trim() || defaultPageTitle(slug),
      content,
      updatedAt: parsed.updatedAt ?? now,
      publishedAt: parsed.publishedAt ?? now,
    }
  } catch {
    return null
  }
}

async function readPublishedPageFromDisk(
  slug: string,
): Promise<PublishedMarketingPage | null> {
  // Prefer runtime overlay (session publishes on read-only hosts), then repo.
  return (
    (await readPageJson(publishedRuntimeFilePath(slug), slug)) ??
    (await readPageJson(publishedRepoFilePath(slug), slug))
  )
}

async function writePublishedPageToDisk(page: PublishedMarketingPage) {
  // Always try runtime (writable). Also try repo path for local commits.
  const payload = `${JSON.stringify(pagePayload(page), null, 2)}\n`
  await safeWriteFile(publishedRuntimeFilePath(page.slug), payload)
  if (!process.env.VERCEL) {
    await safeWriteFile(publishedRepoFilePath(page.slug), payload)
  }
}

async function writeDraftToDisk(draft: MarketingDraft) {
  // Always attempt a safe write (repo drafts/ locally, /tmp on Vercel).
  // Never throw — demo and read-only hosts continue in memory.
  const file = path.join(draftsDir(), `${draft.id}.json`)
  await safeWriteFile(file, `${JSON.stringify(draft, null, 2)}\n`)
}

async function deleteDraftFromDisk(id: string) {
  try {
    await fs.unlink(path.join(draftsDir(), `${id}.json`))
  } catch {
    // ignore
  }
}

async function deletePublishedPageFromDisk(slug: string) {
  if (slug === HOME_PAGE_SLUG) return
  for (const file of [
    publishedRuntimeFilePath(slug),
    publishedRepoFilePath(slug),
  ]) {
    try {
      await fs.unlink(file)
    } catch {
      // ignore
    }
  }
}

async function loadDraftsFromDisk(): Promise<MarketingDraft[]> {
  try {
    await ensureRuntimeDirs()
    const names = await fs.readdir(draftsDir())
    const drafts: MarketingDraft[] = []
    for (const name of names) {
      if (!name.endsWith('.json') || name.startsWith('.')) continue
      try {
        const raw = await fs.readFile(path.join(draftsDir(), name), 'utf8')
        const parsed = JSON.parse(raw) as MarketingDraft
        if (parsed?.id && parsed?.content) {
          drafts.push({
            ...parsed,
            pageSlug: parsed.pageSlug || HOME_PAGE_SLUG,
            content: parseHomepageContent(parsed.content),
          })
        }
      } catch {
        // skip bad files
      }
    }
    return drafts
  } catch {
    return []
  }
}

async function loadPagesFromDir(
  dir: string,
): Promise<PublishedMarketingPage[]> {
  try {
    const names = await fs.readdir(dir)
    const pages: PublishedMarketingPage[] = []
    for (const name of names) {
      if (!name.endsWith('.json')) continue
      const slug = name.replace(/\.json$/, '')
      const page = await readPageJson(path.join(dir, name), slug)
      if (page) pages.push(page)
    }
    return pages
  } catch {
    return []
  }
}

async function seedMemoryIfNeeded() {
  const state = memory()
  if (state.seeded) return

  await probeDiskWritable()

  const home =
    (await readPublishedPageFromDisk(HOME_PAGE_SLUG)) ??
    ({
      slug: HOME_PAGE_SLUG,
      title: 'Homepage',
      content: DEFAULT_HOMEPAGE_CONTENT,
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    } satisfies PublishedMarketingPage)

  state.pages.set(HOME_PAGE_SLUG, home)

  for (const page of await loadPagesFromDir(REPO_PAGES_DIR)) {
    state.pages.set(page.slug, page)
  }
  // Runtime overlays win (includes unpublished shells + session publishes)
  for (const page of await loadPagesFromDir(runtimePagesDir())) {
    state.pages.set(page.slug, page)
  }

  for (const draft of await loadDraftsFromDisk()) {
    state.drafts.set(draft.id, draft)
  }

  state.seeded = true
}

function newId() {
  return `mkt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export async function listPublishedPages(): Promise<PublishedMarketingPage[]> {
  await seedMemoryIfNeeded()
  return [...memory().pages.values()].sort((a, b) => {
    if (a.slug === HOME_PAGE_SLUG) return -1
    if (b.slug === HOME_PAGE_SLUG) return 1
    return a.title.localeCompare(b.title)
  })
}

export async function getPublishedPage(
  slug: string,
): Promise<PublishedMarketingPage | null> {
  await seedMemoryIfNeeded()
  return memory().pages.get(slug) ?? null
}

export async function getPublishedHomepage(): Promise<HomepageContent> {
  const page = await getPublishedPage(HOME_PAGE_SLUG)
  return page?.content ?? DEFAULT_HOMEPAGE_CONTENT
}

export async function listMarketingDrafts(
  pageSlug?: string,
): Promise<MarketingDraft[]> {
  await seedMemoryIfNeeded()
  return [...memory().drafts.values()]
    .filter((d) => (pageSlug ? d.pageSlug === pageSlug : true))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getMarketingDraft(
  id: string,
): Promise<MarketingDraft | null> {
  await seedMemoryIfNeeded()
  return memory().drafts.get(id) ?? null
}

export async function createMarketingDraft(input: {
  name: string
  pageSlug?: string
  content?: HomepageContent
  createdBy: string
  promptHistory?: MarketingPromptEntry[]
}): Promise<MarketingDraft> {
  await seedMemoryIfNeeded()
  const pageSlug = input.pageSlug || HOME_PAGE_SLUG
  const published = memory().pages.get(pageSlug)
  const now = new Date().toISOString()
  const draft: MarketingDraft = {
    id: newId(),
    pageSlug,
    name: input.name.trim() || 'Untitled draft',
    status: 'draft',
    content: input.content
      ? parseHomepageContent(input.content)
      : structuredClone(published?.content ?? DEFAULT_HOMEPAGE_CONTENT),
    promptHistory: input.promptHistory ?? [],
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
    publishedAt: null,
  }
  memory().drafts.set(draft.id, draft)
  await writeDraftToDisk(draft)
  return draft
}

export async function createMarketingPage(input: {
  slug: string
  title: string
  createdBy: string
  content?: HomepageContent
}): Promise<
  | { draft: MarketingDraft; page: PublishedMarketingPage }
  | { error: string }
> {
  await seedMemoryIfNeeded()
  const valid = validateNewPageSlug(input.slug)
  if (!valid.ok) return { error: valid.error }

  if (memory().pages.has(valid.slug)) {
    return { error: `A page already exists at /p/${valid.slug}` }
  }

  const title = input.title.trim() || defaultPageTitle(valid.slug)
  if (title.length > 160) {
    return { error: 'Title is too long (max 160 characters).' }
  }

  const now = new Date().toISOString()
  const content = parseHomepageContent(
    input.content ?? {
      ...DEFAULT_HOMEPAGE_CONTENT,
      tagline: title.slice(0, 160),
      metaDescription: `${title} — Sidekick swim app for teams.`.slice(0, 300),
    },
  )

  const page: PublishedMarketingPage = {
    slug: valid.slug,
    title,
    content,
    updatedAt: now,
    publishedAt: '', // empty = not live yet
  }

  // Register page before draft so a draft write failure cannot leave us
  // without a page entry.
  memory().pages.set(valid.slug, page)
  await writePublishedPageToDisk(page)

  const draft = await createMarketingDraft({
    name: `${title} — first draft`,
    pageSlug: valid.slug,
    content,
    createdBy: input.createdBy,
  })

  return { draft, page }
}

export async function updateMarketingDraft(
  id: string,
  patch: {
    name?: string
    content?: HomepageContent
    promptHistory?: MarketingPromptEntry[]
    status?: MarketingDraftStatus
    publishedAt?: string | null
  },
): Promise<MarketingDraft | null> {
  await seedMemoryIfNeeded()
  const existing = memory().drafts.get(id)
  if (!existing) return null
  const next: MarketingDraft = {
    ...existing,
    name: patch.name?.trim() || existing.name,
    content: patch.content
      ? parseHomepageContent(patch.content)
      : existing.content,
    promptHistory: patch.promptHistory ?? existing.promptHistory,
    status: patch.status ?? existing.status,
    publishedAt:
      patch.publishedAt !== undefined ? patch.publishedAt : existing.publishedAt,
    updatedAt: new Date().toISOString(),
  }
  memory().drafts.set(id, next)
  await writeDraftToDisk(next)
  return next
}

export async function deleteMarketingDraft(id: string): Promise<boolean> {
  await seedMemoryIfNeeded()
  const ok = memory().drafts.delete(id)
  if (ok) await deleteDraftFromDisk(id)
  return ok
}

export async function publishMarketingDraft(
  id: string,
): Promise<
  | {
      draft: MarketingDraft
      page: PublishedMarketingPage
      content: HomepageContent
      publicPath: string
    }
  | null
> {
  await seedMemoryIfNeeded()
  const draft = memory().drafts.get(id)
  if (!draft) return null

  const content = parseHomepageContent(draft.content)
  const now = new Date().toISOString()
  const existing = memory().pages.get(draft.pageSlug)
  const page: PublishedMarketingPage = {
    slug: draft.pageSlug,
    title: existing?.title || defaultPageTitle(draft.pageSlug),
    content,
    updatedAt: now,
    publishedAt: now,
  }
  memory().pages.set(draft.pageSlug, page)
  await writePublishedPageToDisk(page)

  const next: MarketingDraft = {
    ...draft,
    status: 'published',
    publishedAt: now,
    updatedAt: now,
  }
  memory().drafts.set(id, next)
  await writeDraftToDisk(next)
  return {
    draft: next,
    page,
    content,
    publicPath: publicPathForSlug(draft.pageSlug),
  }
}

export async function isPageLive(slug: string): Promise<boolean> {
  const page = await getPublishedPage(slug)
  return Boolean(page?.publishedAt)
}

export function getPublishedHomepagePath() {
  return HOME_PUBLISHED_PATH
}

export function getPublishedPageRelativePath(slug: string) {
  const abs = publishedRepoFilePath(slug)
  return abs.replace(`${process.cwd()}/`, '')
}

export async function deleteMarketingPage(
  slug: string,
): Promise<{ ok: true } | { error: string }> {
  await seedMemoryIfNeeded()
  if (slug === HOME_PAGE_SLUG) {
    return { error: 'The homepage cannot be deleted.' }
  }
  if (!memory().pages.has(slug)) {
    return { error: 'Page not found' }
  }
  memory().pages.delete(slug)
  for (const [id, draft] of [...memory().drafts]) {
    if (draft.pageSlug === slug) {
      memory().drafts.delete(id)
      await deleteDraftFromDisk(id)
    }
  }
  await deletePublishedPageFromDisk(slug)
  return { ok: true }
}

export async function marketingDiskWritable(): Promise<boolean> {
  await seedMemoryIfNeeded()
  return memory().diskWritable ?? false
}
