'use client'

import {
  applyDesignPromptAction,
  clearDesignPreviewAction,
  commitAndDeployDesignAction,
  createDesignDraftAction,
  deleteDesignDraftAction,
  enableDesignPreviewAction,
  saveDesignDraftAction,
} from '@/app/admin/design/actions'
import type { HomepageContent } from '@/lib/marketing/homepage-schema'
import type { MarketingDraft } from '@/lib/marketing/store'
import { clsx } from 'clsx'
import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from 'react'

const EXAMPLE_PROMPTS = [
  'change the tagline to "Every lap, together"',
  'change the tagline to "Built for the whole team"',
  'Make it more energetic about masters swimming',
] as const

type Props = {
  initialDrafts: MarketingDraft[]
  published: HomepageContent
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

export function DesignMode({ initialDrafts, published }: Props) {
  const [drafts, setDrafts] = useState(initialDrafts)
  const [activeId, setActiveId] = useState<string | null>(
    initialDrafts[0]?.id ?? null,
  )
  const [name, setName] = useState(initialDrafts[0]?.name ?? '')
  const [content, setContent] = useState<HomepageContent>(
    initialDrafts[0]?.content ?? published,
  )
  const [prompt, setPrompt] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewOn, setPreviewOn] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [confirmDeploy, setConfirmDeploy] = useState(false)
  const [pending, startTransition] = useTransition()

  const active = drafts.find((d) => d.id === activeId) ?? null

  const selectDraft = useCallback((draft: MarketingDraft) => {
    setActiveId(draft.id)
    setName(draft.name)
    setContent(draft.content)
    setMessage(null)
    setError(null)
    setPreviewKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (!activeId && drafts[0]) {
      selectDraft(drafts[0])
    }
  }, [activeId, drafts, selectDraft])

  function upsertDraft(draft: MarketingDraft) {
    setDrafts((prev) => {
      const without = prev.filter((d) => d.id !== draft.id)
      return [draft, ...without].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      )
    })
  }

  function run(action: () => Promise<void>) {
    setError(null)
    setMessage(null)
    startTransition(() => {
      void action()
    })
  }

  function onCreateDraft() {
    run(async () => {
      const result = await createDesignDraftAction({
        name: `Draft ${new Date().toLocaleString()}`,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      upsertDraft(result.data)
      selectDraft(result.data)
      setMessage('New draft created from the live homepage.')
    })
  }

  function onApplyPrompt(e?: FormEvent) {
    e?.preventDefault()
    if (!activeId) {
      setError('Create a draft first.')
      return
    }
    const promptText = prompt.trim()
    if (!promptText) {
      setError('Enter a prompt describing the change you want.')
      return
    }
    run(async () => {
      const result = await applyDesignPromptAction({
        draftId: activeId,
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
      if (previewOn) {
        await enableDesignPreviewAction(activeId)
        setPreviewKey((k) => k + 1)
      }
    })
  }

  function onExamplePrompt(example: string) {
    if (!activeId) {
      setError('Create a draft first.')
      return
    }
    setPrompt(example)
    run(async () => {
      const result = await applyDesignPromptAction({
        draftId: activeId,
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
    if (!activeId) {
      setError('Create a draft first.')
      return
    }
    run(async () => {
      const result = await saveDesignDraftAction({
        id: activeId,
        name,
        content,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      upsertDraft(result.data)
      setPreviewKey((k) => k + 1)
      setMessage('Draft saved.')
    })
  }

  function onPreview() {
    if (!activeId) {
      setError('Create a draft first.')
      return
    }
    run(async () => {
      const saved = await saveDesignDraftAction({
        id: activeId,
        name,
        content,
      })
      if ('error' in saved) {
        setError(saved.error)
        return
      }
      upsertDraft(saved.data)
      const result = await enableDesignPreviewAction(activeId)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setPreviewOn(true)
      setPreviewKey((k) => k + 1)
      setMessage(
        'Preview enabled — the iframe and / (this browser) show this draft.',
      )
    })
  }

  function onClearPreview() {
    run(async () => {
      await clearDesignPreviewAction()
      setPreviewOn(false)
      setPreviewKey((k) => k + 1)
      setMessage('Preview cleared — homepage shows the published version.')
    })
  }

  function onCommitDeploy() {
    if (!activeId) {
      setError('Create a draft first.')
      return
    }
    setConfirmDeploy(true)
  }

  function confirmCommitDeploy() {
    if (!activeId) return
    setConfirmDeploy(false)
    run(async () => {
      const result = await commitAndDeployDesignAction({
        draftId: activeId,
        name,
        content,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      upsertDraft(result.data.draft)
      setPreviewOn(false)
      setPreviewKey((k) => k + 1)
      const deploy = result.data.deploy
      setMessage(
        'success' in deploy && deploy.success
          ? deploy.message +
              (deploy.commitUrl ? ` ${deploy.commitUrl}` : '')
          : 'Published.',
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
        const next = drafts.find((d) => d.id !== id)
        if (next) selectDraft(next)
        else {
          setActiveId(null)
          setName('')
          setContent(published)
        }
      }
      setMessage('Draft deleted.')
    })
  }

  function updateField<K extends keyof HomepageContent>(
    key: K,
    value: HomepageContent[K],
  ) {
    setContent((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-6">
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-950">Drafts</h2>
            <button
              type="button"
              onClick={onCreateDraft}
              disabled={pending}
              className="rounded-lg bg-zinc-950 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              New draft
            </button>
          </div>
          {drafts.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              No drafts yet. Create one to start prompting changes.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100">
              {drafts.map((draft) => (
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
                    disabled={pending}
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
                disabled={!activeId || pending}
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
              disabled={!activeId || pending}
            />
            <button
              type="submit"
              disabled={!activeId || pending || !prompt.trim()}
              className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {pending ? 'Working…' : 'Apply prompt'}
            </button>
          </form>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-sm font-semibold text-zinc-950">Copy</h2>
          <div className="mt-4 grid gap-3">
            <label className="block text-xs font-medium text-zinc-600">
              Draft name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!activeId || pending}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 outline-none focus:ring-2 focus:ring-zinc-950 disabled:opacity-50"
              />
            </label>
            {(
              [
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
            ).map(([key, label]) => (
              <label key={key} className="block text-xs font-medium text-zinc-600">
                {label}
                {key === 'body' || key === 'metaDescription' ? (
                  <textarea
                    value={content[key]}
                    onChange={(e) => updateField(key, e.target.value)}
                    rows={key === 'body' ? 3 : 2}
                    disabled={!activeId || pending}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 outline-none focus:ring-2 focus:ring-zinc-950 disabled:opacity-50"
                  />
                ) : (
                  <input
                    value={content[key]}
                    onChange={(e) => updateField(key, e.target.value)}
                    disabled={!activeId || pending}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 outline-none focus:ring-2 focus:ring-zinc-950 disabled:opacity-50"
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
                    <li key={`${entry.at}-${i}`} className="text-xs text-zinc-600">
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
              disabled={!activeId || pending}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={onPreview}
              disabled={!activeId || pending}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              Preview
            </button>
            {previewOn ? (
              <button
                type="button"
                onClick={onClearPreview}
                disabled={pending}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
              >
                Clear preview
              </button>
            ) : null}
            <button
              type="button"
              onClick={onCommitDeploy}
              disabled={!activeId || pending}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              Commit & deploy
            </button>
          </div>

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
                  Publish this draft as the live homepage?
                </h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Visitors will see the new copy after publish. With GitHub
                  token configured, this also commits and triggers a Vercel
                  deploy.
                </p>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDeploy(false)}
                    disabled={pending}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmCommitDeploy}
                    disabled={pending}
                    className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    Yes, commit & deploy
                  </button>
                </div>
              </div>
            </div>
          ) : null}
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
                ? 'Iframe loads this draft via a staff-only preview link. Use Preview to also set a session cookie for /.'
                : 'Create or select a draft to preview the homepage.'}
            </p>
          </div>
          <a
            href={
              activeId
                ? `/?preview=${encodeURIComponent(activeId)}`
                : '/'
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
            title="Marketing homepage preview"
            src={
              activeId
                ? `/?preview=${encodeURIComponent(activeId)}&t=${previewKey}`
                : '/'
            }
            className="h-[min(80vh,52rem)] w-full border-0 bg-[#07131f]"
          />
        </div>
      </section>
    </div>
  )
}
