'use client'

import {
  applyDesignPromptAction,
  clearDesignPreviewAction,
  commitAndDeployDesignAction,
  createDesignDraftAction,
  createDesignPageAction,
  deleteDesignDraftAction,
  deleteDesignPageAction,
  enableDesignPreviewAction,
  saveDesignDraftAction,
} from '@/app/admin/design/actions'
import {
  DEFAULT_HOMEPAGE_CONTENT,
  HOME_PAGE_SLUG,
  publicPathForSlug,
  slugifyPageTitle,
  type HomepageContent,
} from '@/lib/marketing/homepage-schema'
import type {
  MarketingDraft,
  PublishedMarketingPage,
} from '@/lib/marketing/store'
import { clsx } from 'clsx'
import {
  useCallback,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from 'react'

const EXAMPLE_PROMPTS = [
  'change the tagline to "Every lap, together"',
  'change the tagline to "Built for the whole team"',
  'Make it more energetic about masters swimming',
] as const

const COPY_FIELDS = [
  ['brand', 'Brand'],
  ['tagline', 'Tagline'],
  ['body', 'Supporting sentence'],
  ['androidNote', 'Android note'],
  ['contactPrompt', 'Contact prompt'],
  ['contactEmail', 'Contact email'],
  ['metaDescription', 'Meta description'],
  ['adminLoginLabel', 'Admin login label'],
  ['appStoreUrl', 'App Store URL'],
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

export function DesignMode({ initialPages, initialDrafts }: Props) {
  const [pages, setPages] = useState(initialPages)
  const [drafts, setDrafts] = useState(initialDrafts)
  const [pageSlug, setPageSlug] = useState(
    initialPages[0]?.slug ?? HOME_PAGE_SLUG,
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [content, setContent] = useState<HomepageContent>(
    () => initialPages[0]?.content ?? DEFAULT_HOMEPAGE_CONTENT,
  )
  const [prompt, setPrompt] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewOn, setPreviewOn] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [confirmDeploy, setConfirmDeploy] = useState(false)
  const [showNewPage, setShowNewPage] = useState(false)
  const [newPageTitle, setNewPageTitle] = useState('')
  const [newPageSlug, setNewPageSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [pending, startTransition] = useTransition()
  /** True while we are auto-creating a draft so fields stay editable. */
  const [ensuringDraft, setEnsuringDraft] = useState(false)

  const activePage = pages.find((p) => p.slug === pageSlug) ?? pages[0]
  const pageDrafts = useMemo(
    () => drafts.filter((d) => d.pageSlug === pageSlug),
    [drafts, pageSlug],
  )
  const active = drafts.find((d) => d.id === activeId) ?? null
  const publicPath = publicPathForSlug(pageSlug)
  const previewSrc = activeId
    ? `${publicPath}?preview=${encodeURIComponent(activeId)}&t=${previewKey}`
    : publicPath

  const selectDraft = useCallback((draft: MarketingDraft) => {
    setActiveId(draft.id)
    setPageSlug(draft.pageSlug)
    setName(draft.name)
    setContent(draft.content)
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
      setContent(page.content)
      setMessage(null)
      setError(null)
      setPreviewOn(false)
      setPreviewKey((k) => k + 1)
      const first = drafts.find((d) => d.pageSlug === slug)
      if (first) {
        setActiveId(first.id)
        setName(first.name)
        setContent(first.content)
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
      void action()
    })
  }

  /** Ensure a draft exists so edits/prompts have somewhere to land. Fields stay editable. */
  async function ensureDraft(): Promise<string | null> {
    if (activeId) return activeId
    setEnsuringDraft(true)
    try {
      const result = await createDesignDraftAction({
        name: `Draft ${new Date().toLocaleString()}`,
        pageSlug,
        content,
      })
      if ('error' in result) {
        setError(result.error)
        return null
      }
      upsertDraft(result.data)
      setActiveId(result.data.id)
      setName(result.data.name)
      setContent(result.data.content)
      return result.data.id
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
      setMessage('New draft created from the published page.')
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
        `Created page “${result.data.page.title}” at ${publicPathForSlug(result.data.page.slug)}. Publish to make it live.`,
      )
    })
  }

  function onApplyPrompt(e?: FormEvent) {
    e?.preventDefault()
    const promptText = prompt.trim()
    if (!promptText) {
      setError('Enter a prompt describing the change you want.')
      return
    }
    run(async () => {
      const draftId = await ensureDraft()
      if (!draftId) return
      const result = await applyDesignPromptAction({
        draftId,
        prompt: promptText,
        content,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      upsertDraft(result.data.draft)
      setContent(result.data.content)
      setPrompt('')
      setPreviewKey((k) => k + 1)
      setMessage(
        result.data.note ||
          (result.data.source === 'ai'
            ? 'Applied AI suggestion to the draft.'
            : 'Applied heuristic edit to the draft.'),
      )
    })
  }

  function onExamplePrompt(example: string) {
    setPrompt(example)
    run(async () => {
      const draftId = await ensureDraft()
      if (!draftId) return
      const result = await applyDesignPromptAction({
        draftId,
        prompt: example,
        content,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      upsertDraft(result.data.draft)
      setContent(result.data.content)
      setPrompt('')
      setPreviewKey((k) => k + 1)
      setMessage(
        result.data.note ||
          (result.data.source === 'ai'
            ? 'Applied AI suggestion to the draft.'
            : 'Applied heuristic edit to the draft.'),
      )
    })
  }

  function onSaveDraft() {
    run(async () => {
      const draftId = await ensureDraft()
      if (!draftId) return
      const result = await saveDesignDraftAction({
        id: draftId,
        name: name || `Draft ${new Date().toLocaleString()}`,
        content,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      upsertDraft(result.data)
      setName(result.data.name)
      setPreviewKey((k) => k + 1)
      setMessage('Draft saved.')
    })
  }

  function onPreview() {
    run(async () => {
      const draftId = await ensureDraft()
      if (!draftId) return
      const saved = await saveDesignDraftAction({
        id: draftId,
        name: name || `Draft ${new Date().toLocaleString()}`,
        content,
      })
      if ('error' in saved) {
        setError(saved.error)
        return
      }
      upsertDraft(saved.data)
      setName(saved.data.name)
      const result = await enableDesignPreviewAction(draftId)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setPreviewOn(true)
      setPreviewKey((k) => k + 1)
      setMessage(
        `Preview enabled — open ${result.data.previewPath} to view this draft.`,
      )
    })
  }

  function onClearPreview() {
    run(async () => {
      await clearDesignPreviewAction()
      setPreviewOn(false)
      setPreviewKey((k) => k + 1)
      setMessage('Preview cleared — public path shows the published version.')
    })
  }

  function onCommitDeploy() {
    setConfirmDeploy(true)
  }

  function confirmCommitDeploy() {
    setConfirmDeploy(false)
    run(async () => {
      const draftId = await ensureDraft()
      if (!draftId) return
      const result = await commitAndDeployDesignAction({
        draftId,
        name: name || `Draft ${new Date().toLocaleString()}`,
        content,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      upsertDraft(result.data.draft)
      upsertPage(result.data.page)
      setPreviewOn(false)
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
          setContent(activePage?.content ?? content)
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

  function updateField<K extends keyof HomepageContent>(
    key: K,
    value: HomepageContent[K],
  ) {
    setContent((prev) => ({ ...prev, [key]: value }))
  }

  const busy = pending || ensuringDraft

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
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
              No drafts yet — edit any field or apply a prompt and a draft will
              be created automatically.
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
                      Updated {new Date(draft.updatedAt).toLocaleString()}
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
          <h2 className="text-sm font-semibold text-zinc-950">Prompt</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Describe the change in plain language, or pick an example below.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => onExamplePrompt(example)}
                disabled={busy}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
          <form onSubmit={onApplyPrompt} className="mt-4 space-y-3">
            <textarea
              id="design-prompt"
              name="design-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Make the copy punchier for masters swim teams…"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 outline-none ring-zinc-950 focus:ring-2"
            />
            <button
              type="submit"
              disabled={busy || !prompt.trim()}
              className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {busy ? 'Working…' : 'Apply prompt'}
            </button>
          </form>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-sm font-semibold text-zinc-950">Copy</h2>
          <p className="mt-1 text-xs text-zinc-500">
            All fields are editable. Saving or prompting creates a draft if
            needed.
          </p>
          <div className="mt-4 grid gap-3">
            <label className="block text-xs font-medium text-zinc-600">
              Draft name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Untitled draft"
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 outline-none focus:ring-2 focus:ring-zinc-950"
              />
            </label>
            {COPY_FIELDS.map(([key, label]) => (
              <label key={key} className="block text-xs font-medium text-zinc-600">
                {label}
                {key === 'body' || key === 'metaDescription' ? (
                  <textarea
                    value={content[key]}
                    onChange={(e) => updateField(key, e.target.value)}
                    rows={key === 'body' ? 3 : 2}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 outline-none focus:ring-2 focus:ring-zinc-950"
                  />
                ) : (
                  <input
                    value={content[key]}
                    onChange={(e) => updateField(key, e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 outline-none focus:ring-2 focus:ring-zinc-950"
                  />
                )}
              </label>
            ))}
          </div>

          {active && active.promptHistory.length > 0 ? (
            <div className="mt-5 border-t border-zinc-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Prompt history
              </h3>
              <ul className="mt-2 space-y-2">
                {active.promptHistory
                  .slice()
                  .reverse()
                  .map((entry, i) => (
                    <li
                      key={`${entry.at}-${i}`}
                      className="text-xs text-zinc-600"
                    >
                      <span className="font-medium text-zinc-800">
                        [{entry.source}]
                      </span>{' '}
                      {entry.prompt}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

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
              Preview
            </button>
            {previewOn ? (
              <button
                type="button"
                onClick={onClearPreview}
                disabled={busy}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
              >
                Clear preview
              </button>
            ) : null}
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
              {activeId
                ? `Previewing draft on ${publicPath}`
                : `Showing published ${publicPath}. Save or prompt to create a draft.`}
            </p>
          </div>
          <a
            href={
              activeId
                ? `${publicPath}?preview=${encodeURIComponent(activeId)}`
                : publicPath
            }
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-zinc-600 underline-offset-2 hover:underline"
          >
            Open preview
          </a>
        </div>
        <div className="relative bg-zinc-100">
          <iframe
            key={previewKey}
            title="Marketing page preview"
            src={previewSrc}
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
              Starts from Sidekick homepage layout. Publish to make it live at{' '}
              <code className="text-xs">/p/your-slug</code>.
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
              Visitors will see the new copy at{' '}
              <strong className="font-medium">{publicPath}</strong>. With
              GitHub token configured, this also commits and triggers a Vercel
              deploy.
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
