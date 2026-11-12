'use client'

import {
  applyElementPromptAction,
  clearDesignPreviewAction,
  commitAndDeployDesignAction,
  createDesignDraftAction,
  createDesignPageAction,
  deleteDesignDraftAction,
  deleteDesignPageAction,
  enableDesignPreviewAction,
  removeElementPatchAction,
  saveDesignDraftAction,
} from '@/app/admin/design/actions'
import {
  DESIGN_SELECT_MESSAGE,
  DESIGN_SELECT_MODE_MESSAGE,
} from '@/components/marketing/design-select-bridge'
import { DESIGN_PATCHES_MESSAGE } from '@/components/marketing/patch-applier'
import {
  DEFAULT_HOMEPAGE_CONTENT,
  HOME_PAGE_SLUG,
  publicPathForSlug,
  slugifyPageTitle,
} from '@/lib/marketing/homepage-schema'
import type { ElementPatch, ElementSelection } from '@/lib/marketing/patches'
import type {
  MarketingDraft,
  PublishedMarketingPage,
} from '@/lib/marketing/store'
import { clsx } from 'clsx'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react'

const DRAFTS_STORAGE_KEY = 'sidekick-design-drafts-v1'

const EXAMPLE_PROMPTS = [
  'change this to "Every lap, together"',
  'Make this shorter and punchier',
  'Rewrite for masters swim teams',
] as const

type Props = {
  initialPages: PublishedMarketingPage[]
  initialDrafts: MarketingDraft[]
}

function statusBadge(status: MarketingDraft['status']) {
  return (
    <span
      className={clsx(
        'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        status === 'published'
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-zinc-100 text-zinc-600',
      )}
    >
      {status}
    </span>
  )
}

function pageLive(page: PublishedMarketingPage) {
  return Boolean(page.publishedAt)
}

function readStoredDrafts(): MarketingDraft[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(DRAFTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MarketingDraft[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStoredDrafts(drafts: MarketingDraft[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts))
  } catch {
    // quota / private mode — ignore
  }
}

export function DesignMode({ initialPages, initialDrafts }: Props) {
  const [pages, setPages] = useState(initialPages)
  const [drafts, setDrafts] = useState(initialDrafts)
  const [pageSlug, setPageSlug] = useState(
    initialPages[0]?.slug ?? HOME_PAGE_SLUG,
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [patches, setPatches] = useState<ElementPatch[]>(
    () => initialPages[0]?.patches ?? [],
  )
  const [selection, setSelection] = useState<ElementSelection | null>(null)
  const [prompt, setPrompt] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const [confirmDeploy, setConfirmDeploy] = useState(false)
  const [showNewPage, setShowNewPage] = useState(false)
  const [newPageTitle, setNewPageTitle] = useState('')
  const [newPageSlug, setNewPageSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [pending, startTransition] = useTransition()
  const [ensuringDraft, setEnsuringDraft] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const patchesRef = useRef(patches)
  patchesRef.current = patches
  const selectModeRef = useRef(selectMode)
  selectModeRef.current = selectMode

  const activePage = pages.find((p) => p.slug === pageSlug) ?? pages[0]
  const pageDrafts = useMemo(
    () => drafts.filter((d) => d.pageSlug === pageSlug),
    [drafts, pageSlug],
  )
  const active = drafts.find((d) => d.id === activeId) ?? null
  const publicPath = publicPathForSlug(pageSlug)
  const previewSrc = activeId
    ? `${publicPath}?preview=${encodeURIComponent(activeId)}&designSelect=1&t=${previewKey}`
    : `${publicPath}?designSelect=1&t=${previewKey}`

  const pushPatchesToPreview = useCallback((nextPatches: ElementPatch[]) => {
    const frame = iframeRef.current?.contentWindow
    if (!frame) return
    frame.postMessage(
      { type: DESIGN_PATCHES_MESSAGE, patches: nextPatches },
      window.location.origin,
    )
  }, [])

  const pushSelectModeToPreview = useCallback((active: boolean) => {
    const frame = iframeRef.current?.contentWindow
    if (!frame) return
    frame.postMessage(
      { type: DESIGN_SELECT_MODE_MESSAGE, active },
      window.location.origin,
    )
  }, [])

  const syncPreviewFrame = useCallback(() => {
    pushPatchesToPreview(patchesRef.current)
    pushSelectModeToPreview(selectModeRef.current)
  }, [pushPatchesToPreview, pushSelectModeToPreview])

  useEffect(() => {
    const stored = readStoredDrafts()
    if (!stored.length) return
    setDrafts((prev) => {
      const byId = new Map<string, MarketingDraft>()
      for (const d of prev) byId.set(d.id, d)
      for (const d of stored) byId.set(d.id, d)
      return [...byId.values()].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      )
    })
  }, [])

  useEffect(() => {
    writeStoredDrafts(drafts)
  }, [drafts])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      const data = event.data as {
        type?: string
        selection?: ElementSelection
      }
      if (data?.type === 'sidekick-design-frame-ready') {
        syncPreviewFrame()
        return
      }
      if (data?.type !== DESIGN_SELECT_MESSAGE || !data.selection) return
      setSelection(data.selection)
      setError(null)
      setMessage(`Selected ${data.selection.label}. Describe the change below.`)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [syncPreviewFrame])

  useEffect(() => {
    pushPatchesToPreview(patches)
  }, [patches, previewKey, pushPatchesToPreview])

  useEffect(() => {
    pushSelectModeToPreview(selectMode)
  }, [selectMode, previewKey, pushSelectModeToPreview])

  function toggleSelectMode() {
    setSelectMode((prev) => {
      const next = !prev
      setMessage(
        next
          ? 'Selection mode on — click an element in the preview.'
          : 'Selection mode off — preview clicks work normally.',
      )
      setError(null)
      return next
    })
  }

  const selectDraft = useCallback((draft: MarketingDraft) => {
    setActiveId(draft.id)
    setPageSlug(draft.pageSlug)
    setName(draft.name)
    setPatches(draft.patches)
    setSelection(null)
    setSelectMode(false)
    setMessage(null)
    setError(null)
    setPreviewKey((k) => k + 1)
  }, [])

  const selectPage = useCallback(
    (slug: string) => {
      const page = pages.find((p) => p.slug === slug)
      if (!page) return
      setPageSlug(slug)
      setActiveId(null)
      setName('')
      setPatches(page.patches)
      setSelection(null)
      setSelectMode(false)
      setMessage(null)
      setError(null)
      setPreviewKey((k) => k + 1)
      const first = drafts.find((d) => d.pageSlug === slug)
      if (first) {
        setActiveId(first.id)
        setName(first.name)
        setPatches(first.patches)
      }
    },
    [drafts, pages],
  )

  function upsertDraft(draft: MarketingDraft) {
    setDrafts((prev) => {
      const without = prev.filter((d) => d.id !== draft.id)
      return [draft, ...without].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      )
    })
  }

  function upsertPage(page: PublishedMarketingPage) {
    setPages((prev) => {
      const without = prev.filter((p) => p.slug !== page.slug)
      const next = [...without, page]
      return next.sort((a, b) => {
        if (a.slug === HOME_PAGE_SLUG) return -1
        if (b.slug === HOME_PAGE_SLUG) return 1
        return a.title.localeCompare(b.title)
      })
    })
  }

  function run(action: () => Promise<void>) {
    setError(null)
    setMessage(null)
    startTransition(() => {
      void (async () => {
        try {
          await action()
        } catch (err) {
          console.error('[design-mode]', err)
          setError(
            err instanceof Error
              ? err.message
              : 'Something went wrong. Try again.',
          )
        }
      })()
    })
  }

  function buildDraftSnapshot(draftId: string): MarketingDraft {
    const existing = drafts.find((d) => d.id === draftId)
    const now = new Date().toISOString()
    return {
      id: draftId,
      pageSlug,
      name: name || existing?.name || 'Untitled draft',
      status: existing?.status ?? 'draft',
      content:
        existing?.content ??
        activePage?.content ??
        DEFAULT_HOMEPAGE_CONTENT,
      patches,
      promptHistory: existing?.promptHistory ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      createdBy: existing?.createdBy ?? 'staff',
      publishedAt: existing?.publishedAt ?? null,
    }
  }

  async function ensureDraft(): Promise<MarketingDraft | null> {
    if (activeId) return buildDraftSnapshot(activeId)
    setEnsuringDraft(true)
    try {
      const result = await createDesignDraftAction({
        name: `Draft ${new Date().toLocaleString()}`,
        pageSlug,
        content: activePage?.content ?? DEFAULT_HOMEPAGE_CONTENT,
      })
      if ('error' in result) {
        setError(result.error)
        return null
      }
      const draft = {
        ...result.data,
        patches: patches.length ? patches : result.data.patches,
      }
      upsertDraft(draft)
      setActiveId(draft.id)
      setName(draft.name)
      setPatches(draft.patches)
      return draft
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not create a draft. Try again.',
      )
      return null
    } finally {
      setEnsuringDraft(false)
    }
  }

  function onCreateDraft() {
    run(async () => {
      const result = await createDesignDraftAction({
        name: `Draft ${new Date().toLocaleString()}`,
        pageSlug,
        content: activePage?.content,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      upsertDraft(result.data)
      selectDraft(result.data)
      setMessage('New draft created. Click an element in the preview to edit.')
    })
  }

  function onCreatePage(e: FormEvent) {
    e.preventDefault()
    run(async () => {
      const result = await createDesignPageAction({
        title: newPageTitle,
        slug: newPageSlug || undefined,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      upsertPage(result.data.page)
      upsertDraft(result.data.draft)
      setShowNewPage(false)
      setNewPageTitle('')
      setNewPageSlug('')
      setSlugTouched(false)
      selectDraft(result.data.draft)
      setMessage(
        `Created page “${result.data.page.title}” at ${publicPathForSlug(result.data.page.slug)}. Click elements to edit, then publish.`,
      )
    })
  }

  function onApplyPrompt(e?: FormEvent) {
    e?.preventDefault()
    if (!selection) {
      setError('Click an element in the preview first.')
      return
    }
    const promptText = prompt.trim()
    if (!promptText) {
      setError('Enter a prompt describing the change you want.')
      return
    }
    run(async () => {
      const snapshot = await ensureDraft()
      if (!snapshot) return
      const result = await applyElementPromptAction({
        draftId: snapshot.id,
        prompt: promptText,
        selection,
        draftSnapshot: snapshot,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      upsertDraft(result.data.draft)
      setPatches(result.data.draft.patches)
      setPrompt('')
      pushPatchesToPreview(result.data.draft.patches)
      setMessage(
        result.data.note ||
          `Updated ${result.data.patch.label || result.data.patch.tagName}.`,
      )
    })
  }

  function onExamplePrompt(example: string) {
    if (!selection) {
      setError('Click an element in the preview first.')
      return
    }
    setPrompt(example)
    run(async () => {
      const snapshot = await ensureDraft()
      if (!snapshot) return
      const result = await applyElementPromptAction({
        draftId: snapshot.id,
        prompt: example,
        selection,
        draftSnapshot: snapshot,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      upsertDraft(result.data.draft)
      setPatches(result.data.draft.patches)
      setPrompt('')
      pushPatchesToPreview(result.data.draft.patches)
      setMessage(
        result.data.note ||
          `Updated ${result.data.patch.label || result.data.patch.tagName}.`,
      )
    })
  }

  function onSaveDraft() {
    run(async () => {
      const snapshot = await ensureDraft()
      if (!snapshot) return
      const result = await saveDesignDraftAction({
        id: snapshot.id,
        name: name || `Draft ${new Date().toLocaleString()}`,
        patches,
        draftSnapshot: snapshot,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      upsertDraft(result.data)
      setName(result.data.name)
      setPatches(result.data.patches)
      pushPatchesToPreview(result.data.patches)
      setMessage('Draft saved.')
    })
  }

  function onPreview() {
    run(async () => {
      const snapshot = await ensureDraft()
      if (!snapshot) return
      await saveDesignDraftAction({
        id: snapshot.id,
        name: name || `Draft ${new Date().toLocaleString()}`,
        patches,
        draftSnapshot: snapshot,
      })
      const result = await enableDesignPreviewAction(snapshot.id, snapshot)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setPreviewKey((k) => k + 1)
      setMessage(
        `Preview ready — toggle Select element, click a target, then prompt.`,
      )
    })
  }

  function onClearPreview() {
    run(async () => {
      await clearDesignPreviewAction()
      setPreviewKey((k) => k + 1)
      setMessage('Preview cookie cleared.')
    })
  }

  function onRemovePatch(designId: string) {
    if (!activeId) return
    run(async () => {
      const snapshot = buildDraftSnapshot(activeId)
      const result = await removeElementPatchAction({
        draftId: activeId,
        designId,
        draftSnapshot: snapshot,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      upsertDraft(result.data)
      setPatches(result.data.patches)
      pushPatchesToPreview(result.data.patches)
      setMessage('Patch removed.')
    })
  }

  function onCommitDeploy() {
    setConfirmDeploy(true)
  }

  function confirmCommitDeploy() {
    setConfirmDeploy(false)
    run(async () => {
      const snapshot = await ensureDraft()
      if (!snapshot) return
      const result = await commitAndDeployDesignAction({
        draftId: snapshot.id,
        name: name || `Draft ${new Date().toLocaleString()}`,
        patches,
        draftSnapshot: snapshot,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      upsertDraft(result.data.draft)
      upsertPage(result.data.page)
      setPatches(result.data.draft.patches)
      pushPatchesToPreview(result.data.draft.patches)
      setPreviewKey((k) => k + 1)
      const deploy = result.data.deploy
      setMessage(
        'success' in deploy && deploy.success
          ? `${deploy.message} Live at ${result.data.publicPath}${
              deploy.commitUrl ? ` ${deploy.commitUrl}` : ''
            }`
          : `Published at ${result.data.publicPath}.`,
      )
    })
  }

  function onDeleteDraft(id: string) {
    const ok = window.confirm('Delete this draft?')
    if (!ok) return
    run(async () => {
      const result = await deleteDesignDraftAction(id)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setDrafts((prev) => prev.filter((d) => d.id !== id))
      if (activeId === id) {
        const next = pageDrafts.find((d) => d.id !== id)
        if (next) selectDraft(next)
        else {
          setActiveId(null)
          setName('')
          setPatches(activePage?.patches ?? [])
          setSelection(null)
        }
      }
      setMessage('Draft deleted.')
    })
  }

  function onDeletePage() {
    if (pageSlug === HOME_PAGE_SLUG) return
    const ok = window.confirm(
      `Delete page “${activePage?.title}” (${publicPath})? This cannot be undone.`,
    )
    if (!ok) return
    run(async () => {
      const result = await deleteDesignPageAction(pageSlug)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setPages((prev) => prev.filter((p) => p.slug !== pageSlug))
      setDrafts((prev) => prev.filter((d) => d.pageSlug !== pageSlug))
      selectPage(HOME_PAGE_SLUG)
      setMessage('Page deleted.')
    })
  }

  const busy = pending || ensuringDraft

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="space-y-6">
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-950">Pages</h2>
            <button
              type="button"
              onClick={() => {
                setShowNewPage(true)
                setError(null)
              }}
              className="rounded-lg bg-zinc-950 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
            >
              New page
            </button>
          </div>
          <ul className="mt-3 divide-y divide-zinc-100">
            {pages.map((page) => (
              <li key={page.slug}>
                <button
                  type="button"
                  onClick={() => selectPage(page.slug)}
                  className={clsx(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-zinc-50',
                    page.slug === pageSlug && 'bg-zinc-100',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-zinc-900">
                      {page.title}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {publicPathForSlug(page.slug)}
                    </span>
                  </span>
                  <span
                    className={clsx(
                      'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      pageLive(page)
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900',
                    )}
                  >
                    {pageLive(page) ? 'live' : 'unpublished'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {pageSlug !== HOME_PAGE_SLUG ? (
            <button
              type="button"
              onClick={onDeletePage}
              disabled={busy}
              className="mt-3 text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              Delete this page
            </button>
          ) : null}
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-950">Drafts</h2>
              <p className="text-xs text-zinc-500">
                For {activePage?.title ?? 'page'} ({publicPath})
              </p>
            </div>
            <button
              type="button"
              onClick={onCreateDraft}
              disabled={busy}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              New draft
            </button>
          </div>
          {pageDrafts.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              No drafts yet — select an element and apply a prompt to start one.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100">
              {pageDrafts.map((draft) => (
                <li key={draft.id} className="flex items-center gap-2 py-2">
                  <button
                    type="button"
                    onClick={() => selectDraft(draft)}
                    className={clsx(
                      'min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-zinc-50',
                      draft.id === activeId && 'bg-zinc-100',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium text-zinc-900">
                        {draft.name}
                      </span>
                      {statusBadge(draft.status)}
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      {draft.patches.length} patch
                      {draft.patches.length === 1 ? '' : 'es'} · Updated{' '}
                      {new Date(draft.updatedAt).toLocaleString()}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteDraft(draft.id)}
                    disabled={busy}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-950">
                Selected element
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Turn selection mode on, then click an element in the preview.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={selectMode}
              onClick={toggleSelectMode}
              className={clsx(
                'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                selectMode
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
              )}
            >
              {selectMode ? 'Selecting…' : 'Select element'}
            </button>
          </div>
          {selection ? (
            <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-800 ring-1 ring-zinc-200">
              <p className="font-medium">{selection.label}</p>
              <p className="mt-1 font-mono text-[11px] text-zinc-500">
                {selection.selector}
              </p>
              <p className="mt-2 line-clamp-4 text-zinc-600">
                {selection.textContent || '(no text content)'}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              {selectMode
                ? 'Click any element in the live preview — headlines, paragraphs, links, buttons, anything in the DOM.'
                : 'Selection mode is off. Toggle it on to pick an element without following preview links.'}
            </p>
          )}

          <h3 className="mt-5 text-sm font-semibold text-zinc-950">Prompt</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => onExamplePrompt(example)}
                disabled={busy || !selection}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
          <form onSubmit={onApplyPrompt} className="mt-3 space-y-3">
            <textarea
              id="design-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder={
                selection
                  ? 'Describe how this element should change…'
                  : 'Select an element in the preview first…'
              }
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 outline-none ring-zinc-950 focus:ring-2"
            />
            <button
              type="submit"
              disabled={busy || !selection || !prompt.trim()}
              className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {busy ? 'Working…' : 'Apply prompt to selection'}
            </button>
          </form>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <label className="block text-xs font-medium text-zinc-600">
            Draft name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Untitled draft"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 outline-none focus:ring-2 focus:ring-zinc-950"
            />
          </label>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Patches ({patches.length})
          </h3>
          {patches.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">No element edits yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {patches.map((patch) => (
                <li
                  key={patch.id}
                  className="flex items-start justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-700 ring-1 ring-zinc-200"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900">
                      {patch.label || patch.tagName}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-zinc-600">
                      {patch.value}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemovePatch(patch.designId)}
                    disabled={busy || !activeId}
                    className="shrink-0 text-zinc-500 hover:text-red-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={busy}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={onPreview}
              disabled={busy}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              Refresh preview
            </button>
            <button
              type="button"
              onClick={onClearPreview}
              disabled={busy}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              Clear preview cookie
            </button>
            <button
              type="button"
              onClick={onCommitDeploy}
              disabled={busy}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              Commit & deploy
            </button>
          </div>
        </section>

        {(message || error) && (
          <div
            className={clsx(
              'rounded-xl px-4 py-3 text-sm',
              error
                ? 'bg-red-50 text-red-800 ring-1 ring-red-100'
                : 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100',
            )}
          >
            {error ?? message}
          </div>
        )}
      </div>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950">Live preview</h2>
            <p className="text-xs text-zinc-500">
              {selectMode
                ? 'Selection mode on — amber hover, green selected.'
                : 'Browse normally, or turn on Select element to pick a target.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={selectMode}
              onClick={toggleSelectMode}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                selectMode
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
              )}
            >
              {selectMode ? 'Selecting…' : 'Select element'}
            </button>
            <a
              href={previewSrc}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-zinc-600 underline-offset-2 hover:underline"
            >
              Open preview
            </a>
          </div>
        </div>
        <div className="relative bg-zinc-100">
          <iframe
            ref={iframeRef}
            key={previewKey}
            title="Marketing page preview"
            src={previewSrc}
            onLoad={syncPreviewFrame}
            className="h-[min(80vh,52rem)] w-full border-0 bg-[#07131f]"
          />
        </div>
      </section>

      {showNewPage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-page-title"
        >
          <form
            onSubmit={onCreatePage}
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg ring-1 ring-zinc-200"
          >
            <h3
              id="new-page-title"
              className="text-base font-semibold text-zinc-950"
            >
              Create a new page
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              Starts from the Sidekick marketing layout. After create, toggle
              Select element, click a target, and prompt changes — structure
              does not need to match title/tagline fields.
            </p>
            <label className="mt-4 block text-xs font-medium text-zinc-600">
              Title
              <input
                autoFocus
                value={newPageTitle}
                onChange={(e) => {
                  const title = e.target.value
                  setNewPageTitle(title)
                  if (!slugTouched) setNewPageSlug(slugifyPageTitle(title))
                }}
                placeholder="Summer camp"
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 outline-none focus:ring-2 focus:ring-zinc-950"
              />
            </label>
            <label className="mt-3 block text-xs font-medium text-zinc-600">
              URL slug
              <input
                value={newPageSlug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setNewPageSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, '-')
                      .replace(/--+/g, '-'),
                  )
                }}
                placeholder="summer-camp"
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 outline-none focus:ring-2 focus:ring-zinc-950"
              />
              <span className="mt-1 block text-xs font-normal text-zinc-400">
                Will be live at /p/{newPageSlug || '…'}
              </span>
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewPage(false)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !newPageTitle.trim()}
                className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Create page
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {confirmDeploy ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deploy-confirm-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg ring-1 ring-zinc-200">
            <h3
              id="deploy-confirm-title"
              className="text-base font-semibold text-zinc-950"
            >
              Publish this draft as the live page?
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              Element patches will apply on{' '}
              <strong className="font-medium">{publicPath}</strong> for all
              visitors.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeploy(false)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCommitDeploy}
                disabled={busy}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                Yes, commit & deploy
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
