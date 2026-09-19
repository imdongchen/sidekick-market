import { isAdminDemoMode } from '@/lib/admin-demo-server'
import {
  DEFAULT_HOMEPAGE_CONTENT,
  parseHomepageContent,
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

const CONTENT_DIR = path.join(process.cwd(), 'content', 'marketing')
const PUBLISHED_PATH = path.join(CONTENT_DIR, 'homepage.json')
const DRAFTS_DIR = path.join(CONTENT_DIR, 'drafts')

type MemoryState = {
  published: HomepageContent
  drafts: Map<string, MarketingDraft>
  seeded: boolean
}

declare global {
  // eslint-disable-next-line no-var
  var __sidekickMarketingStore: MemoryState | undefined
}

function memory(): MemoryState {
  if (!globalThis.__sidekickMarketingStore) {
    globalThis.__sidekickMarketingStore = {
      published: DEFAULT_HOMEPAGE_CONTENT,
      drafts: new Map(),
      seeded: false,
    }
  }
  return globalThis.__sidekickMarketingStore
}

async function ensureDirs() {
  await fs.mkdir(DRAFTS_DIR, { recursive: true })
}

async function readPublishedFromDisk(): Promise<HomepageContent> {
  try {
    const raw = await fs.readFile(PUBLISHED_PATH, 'utf8')
    return parseHomepageContent(JSON.parse(raw))
  } catch {
    return DEFAULT_HOMEPAGE_CONTENT
  }
}

async function writePublishedToDisk(content: HomepageContent) {
  await ensureDirs()
  await fs.writeFile(
    PUBLISHED_PATH,
    `${JSON.stringify(content, null, 2)}\n`,
    'utf8',
  )
}

async function writeDraftToDisk(draft: MarketingDraft) {
  if (isAdminDemoMode()) return
  await ensureDirs()
  const file = path.join(DRAFTS_DIR, `${draft.id}.json`)
  await fs.writeFile(file, `${JSON.stringify(draft, null, 2)}\n`, 'utf8')
}

async function deleteDraftFromDisk(id: string) {
  if (isAdminDemoMode()) return
  try {
    await fs.unlink(path.join(DRAFTS_DIR, `${id}.json`))
  } catch {
    // ignore
  }
}

async function loadDraftsFromDisk(): Promise<MarketingDraft[]> {
  try {
    await ensureDirs()
    const names = await fs.readdir(DRAFTS_DIR)
    const drafts: MarketingDraft[] = []
    for (const name of names) {
      if (!name.endsWith('.json')) continue
      try {
        const raw = await fs.readFile(path.join(DRAFTS_DIR, name), 'utf8')
        const parsed = JSON.parse(raw) as MarketingDraft
        if (parsed?.id && parsed?.content) {
          drafts.push({
            ...parsed,
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

async function seedMemoryIfNeeded() {
  const state = memory()
  if (state.seeded) return
  state.published = await readPublishedFromDisk()
  if (!isAdminDemoMode()) {
    const diskDrafts = await loadDraftsFromDisk()
    for (const draft of diskDrafts) {
      state.drafts.set(draft.id, draft)
    }
  }
  state.seeded = true
}

function newId() {
  return `mkt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export async function getPublishedHomepage(): Promise<HomepageContent> {
  await seedMemoryIfNeeded()
  return memory().published
}

export async function listMarketingDrafts(): Promise<MarketingDraft[]> {
  await seedMemoryIfNeeded()
  return [...memory().drafts.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )
}

export async function getMarketingDraft(
  id: string,
): Promise<MarketingDraft | null> {
  await seedMemoryIfNeeded()
  return memory().drafts.get(id) ?? null
}

export async function createMarketingDraft(input: {
  name: string
  content?: HomepageContent
  createdBy: string
  promptHistory?: MarketingPromptEntry[]
}): Promise<MarketingDraft> {
  await seedMemoryIfNeeded()
  const now = new Date().toISOString()
  const draft: MarketingDraft = {
    id: newId(),
    name: input.name.trim() || 'Untitled draft',
    status: 'draft',
    content: input.content
      ? parseHomepageContent(input.content)
      : structuredClone(memory().published),
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
): Promise<{ draft: MarketingDraft; content: HomepageContent } | null> {
  await seedMemoryIfNeeded()
  const draft = memory().drafts.get(id)
  if (!draft) return null

  const content = parseHomepageContent(draft.content)
  memory().published = content

  if (!isAdminDemoMode()) {
    await writePublishedToDisk(content)
  }

  const now = new Date().toISOString()
  const next: MarketingDraft = {
    ...draft,
    status: 'published',
    publishedAt: now,
    updatedAt: now,
  }
  memory().drafts.set(id, next)
  await writeDraftToDisk(next)
  return { draft: next, content }
}

export function getPublishedHomepagePath() {
  return PUBLISHED_PATH
}
