'use client'

import {
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import type { EmailAudience } from '@/app/admin/emails/actions'
import {
  publishEmailTemplate,
  saveEmailDraft,
  sendTemplateCampaign,
  type DraftEmailResult,
  type ResendTemplateSummary,
  type SendTemplateCampaignResult,
} from '@/app/admin/emails/template-actions'
import {
  buildSidekickEmailHtml,
  previewSidekickEmailHtml,
  slugifyAlias,
} from '@/lib/emails/sidekick-layout'
import type { ComposerMember } from '@/components/admin/email-composer'

type Props = {
  members: ComposerMember[]
  templates: ResendTemplateSummary[]
  templatesError?: string
  resendConfigured: boolean
}

const audienceOptions: {
  value: EmailAudience
  label: string
  description: string
}[] = [
  {
    value: 'all_members',
    label: 'All members',
    description: 'Every non-deactivated member with an email.',
  },
  {
    value: 'all_coaches',
    label: 'All coaches',
    description: 'Members with the coach role.',
  },
  {
    value: 'individuals',
    label: 'Individuals',
    description: 'Pick specific people below.',
  },
]

export function EmailDraftComposer({
  members,
  templates: initialTemplates,
  templatesError,
  resendConfigured,
}: Props) {
  const [name, setName] = useState('')
  const [alias, setAlias] = useState('')
  const [subject, setSubject] = useState('')
  const [headline, setHeadline] = useState('')
  const [body, setBody] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  )
  const [templates, setTemplates] =
    useState<ResendTemplateSummary[]>(initialTemplates)

  const [audience, setAudience] = useState<EmailAudience>('all_members')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [memberQuery, setMemberQuery] = useState('')
  const [mode, setMode] = useState<'now' | 'schedule'>('now')
  const [scheduledLocal, setScheduledLocal] = useState('')
  const [sendTemplateId, setSendTemplateId] = useState(
    () =>
      initialTemplates.find((t) => t.status === 'published')?.id ??
      initialTemplates[0]?.id ??
      '',
  )

  const [draftResult, setDraftResult] = useState<DraftEmailResult | null>(null)
  const [sendResult, setSendResult] =
    useState<SendTemplateCampaignResult | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const coachCount = members.filter((m) => m.role === 'coach').length

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) => {
      const hay =
        `${m.firstName} ${m.lastName} ${m.email} ${m.role ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [memberQuery, members])

  const recipientCount = useMemo(() => {
    if (audience === 'all_members') return members.length
    if (audience === 'all_coaches') return coachCount
    return selectedIds.length
  }, [audience, members.length, coachCount, selectedIds.length])

  const previewHtml = useMemo(() => {
    const html = buildSidekickEmailHtml({
      subject: subject || 'Sidekick',
      headline: headline || 'Your headline',
      body:
        body ||
        'Write the message staff will send. Use a blank line between paragraphs. **Bold** works too.',
      ctaLabel,
      ctaUrl,
    })
    return previewSidekickEmailHtml(html, { firstName: 'Alex' })
  }, [subject, headline, body, ctaLabel, ctaUrl])

  const suggestedAlias = slugifyAlias(alias || name)

  const canSaveDraft =
    resendConfigured &&
    name.trim() &&
    subject.trim() &&
    headline.trim() &&
    body.trim() &&
    !pending

  const selectedSendTemplate = templates.find((t) => t.id === sendTemplateId)
  const canSend =
    resendConfigured &&
    !!sendTemplateId &&
    selectedSendTemplate?.status === 'published' &&
    recipientCount > 0 &&
    (mode === 'now' || !!scheduledLocal) &&
    !pending

  function toggleMember(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function selectAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const m of filteredMembers) next.add(m.id)
      return [...next]
    })
  }

  function resetDraftForm() {
    setName('')
    setAlias('')
    setSubject('')
    setHeadline('')
    setBody('')
    setCtaLabel('')
    setCtaUrl('')
    setEditingTemplateId(null)
    setDraftResult(null)
  }

  function save(publish: boolean) {
    setDraftResult(null)
    startTransition(async () => {
      const response = await saveEmailDraft({
        name,
        alias: suggestedAlias,
        subject,
        headline,
        body,
        ctaLabel,
        ctaUrl,
        templateId: editingTemplateId ?? undefined,
        publish,
      })
      setDraftResult(response)
      if ('success' in response) {
        setEditingTemplateId(response.templateId)
        setSendTemplateId(response.templateId)
        const now = new Date().toISOString()
        setTemplates((prev) => {
          const next: ResendTemplateSummary = {
            id: response.templateId,
            name: name.trim(),
            alias: response.alias,
            status: response.published ? 'published' : 'draft',
            publishedAt: response.published ? now : null,
            updatedAt: now,
            createdAt: now,
          }
          const without = prev.filter((t) => t.id !== response.templateId)
          return [next, ...without]
        })
      }
    })
  }

  function publishExisting(id: string) {
    setDraftResult(null)
    startTransition(async () => {
      const response = await publishEmailTemplate(id)
      if ('error' in response) {
        setDraftResult(response)
        return
      }
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status: 'published',
                publishedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : t,
        ),
      )
      setDraftResult({
        success: true,
        templateId: id,
        alias: templates.find((t) => t.id === id)?.alias ?? null,
        published: true,
      })
      setSendTemplateId(id)
    })
  }

  function submitSend() {
    setSendResult(null)
    startTransition(async () => {
      const response = await sendTemplateCampaign({
        templateId: sendTemplateId,
        audience,
        memberIds: audience === 'individuals' ? selectedIds : undefined,
        mode,
        scheduledAt:
          mode === 'schedule' && scheduledLocal
            ? new Date(scheduledLocal).toISOString()
            : undefined,
        subject: subject.trim() || undefined,
      })
      setSendResult(response)
      setConfirmOpen(false)
    })
  }

  return (
    <div className="space-y-8">
      {!resendConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">Resend is not configured.</strong>{' '}
          Set <code className="text-xs">RESEND_API_KEY</code> (and optionally{' '}
          <code className="text-xs">RESEND_FROM</code>) on the server before
          drafting or sending.
        </div>
      )}

      {templatesError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load Resend templates: {templatesError}
        </div>
      )}

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">
              {editingTemplateId ? 'Edit email draft' : 'Draft new email'}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Builds a Sidekick-branded HTML template and saves it to Resend as
              a draft (or publishes it for sending).
            </p>
          </div>
          {editingTemplateId && (
            <button
              type="button"
              onClick={resetDraftForm}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Start blank draft
            </button>
          )}
        </div>

        <div className="grid gap-0 lg:grid-cols-2">
          <div className="space-y-4 border-b border-zinc-100 p-5 lg:border-b-0 lg:border-r">
            <Field
              label="Template name"
              hint="Shown in Resend dashboard."
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. March practice reminder"
                className={inputClass}
              />
            </Field>

            <Field
              label="Alias"
              hint={`Stable Resend slug. Suggested: ${suggestedAlias || '—'}`}
            >
              <input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="auto from name"
                className={inputClass}
              />
            </Field>

            <Field label="Subject">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line"
                className={inputClass}
              />
            </Field>

            <Field label="Headline">
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Large title inside the email"
                className={inputClass}
              />
            </Field>

            <Field
              label="Body"
              hint="Blank line = new paragraph. Wrap words in **double asterisks** for bold."
            >
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                placeholder={`Hi team —\n\nPractice is at the usual time this week. Bring a towel and your Sidekick check-in.`}
                className={`${inputClass} resize-y`}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="CTA label (optional)">
                <input
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="Open Sidekick"
                  className={inputClass}
                />
              </Field>
              <Field label="CTA URL (optional)">
                <input
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://…"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={!canSaveDraft}
                onClick={() => save(false)}
                className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending
                  ? 'Saving…'
                  : editingTemplateId
                    ? 'Update Resend draft'
                    : 'Save Resend draft'}
              </button>
              <button
                type="button"
                disabled={!canSaveDraft}
                onClick={() => save(true)}
                className="rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending ? 'Working…' : 'Save & publish'}
              </button>
            </div>

            {draftResult && 'error' in draftResult && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {draftResult.error}
              </p>
            )}
            {draftResult && 'success' in draftResult && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {draftResult.published
                  ? 'Published on Resend — ready to send below.'
                  : 'Saved as a Resend draft. Publish before sending.'}{' '}
                <span className="font-mono text-xs">{draftResult.templateId}</span>
              </p>
            )}
          </div>

          <div className="bg-zinc-50 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-zinc-900">Preview</h3>
              <span className="text-xs text-zinc-500">
                Sample first name: Alex
              </span>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
              <iframe
                title="New email preview"
                srcDoc={previewHtml}
                className="h-[36rem] w-full bg-white"
                sandbox=""
              />
            </div>
          </div>
        </div>
      </section>

      {templates.length > 0 && (
        <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-base font-semibold text-zinc-950">
              Resend templates
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Drafts must be published before they can be sent. Select a
              published template below to queue a campaign.
            </p>
          </div>
          <ul className="divide-y divide-zinc-100">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-950">{t.name}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {t.alias ? `${t.alias} · ` : ''}
                    <span className="font-mono">{t.id}</span>
                  </p>
                </div>
                <StatusBadge status={t.status} />
                {t.status === 'draft' && (
                  <button
                    type="button"
                    disabled={!resendConfigured || pending}
                    onClick={() => publishExisting(t.id)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:opacity-40"
                  >
                    Publish
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditingTemplateId(t.id)
                    setName(t.name)
                    setAlias(t.alias ?? '')
                    setSendTemplateId(t.id)
                    setDraftResult(null)
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  Use for edit / send
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="text-base font-semibold text-zinc-950">
            Send published template
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Uses Resend&apos;s template API (
            <code className="text-xs">template.id</code> +{' '}
            <code className="text-xs">USER_FIRST_NAME</code>) via the SDK.
          </p>
        </div>
        <div className="space-y-5 p-5">
          <Field label="Template">
            <select
              value={sendTemplateId}
              onChange={(e) => setSendTemplateId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.status})
                  {t.alias ? ` · ${t.alias}` : ''}
                </option>
              ))}
            </select>
          </Field>

          {selectedSendTemplate &&
            selectedSendTemplate.status !== 'published' && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                This template is still a draft. Publish it before sending.
              </p>
            )}

          <fieldset>
            <legend className="text-sm font-medium text-zinc-900">
              Recipients
            </legend>
            <div className="mt-2 space-y-2">
              {audienceOptions.map((option) => {
                const selected = audience === option.value
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer gap-3 rounded-lg px-3 py-2 ring-1 hover:bg-zinc-50 ${
                      selected ? 'bg-zinc-50 ring-zinc-950' : 'ring-zinc-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="draft-audience"
                      value={option.value}
                      checked={selected}
                      onChange={() => setAudience(option.value)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-zinc-950">
                        {option.label}
                        {option.value === 'all_members' && (
                          <span className="ml-2 text-xs font-normal text-zinc-500">
                            ({members.length})
                          </span>
                        )}
                        {option.value === 'all_coaches' && (
                          <span className="ml-2 text-xs font-normal text-zinc-500">
                            ({coachCount})
                          </span>
                        )}
                        {option.value === 'individuals' && (
                          <span className="ml-2 text-xs font-normal text-zinc-500">
                            ({selectedIds.length} selected)
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-zinc-500">
                        {option.description}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          {audience === 'individuals' && (
            <div className="rounded-lg ring-1 ring-zinc-200">
              <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 p-3">
                <input
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder="Search members…"
                  className="min-w-[10rem] flex-1 rounded-lg border-0 px-3 py-1.5 text-sm shadow-sm ring-1 ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                />
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  Select shown
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  Clear
                </button>
              </div>
              <ul className="max-h-56 divide-y divide-zinc-100 overflow-y-auto">
                {filteredMembers.map((m) => (
                  <li key={m.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-zinc-50">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(m.id)}
                        onChange={() => toggleMember(m.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-zinc-950">
                          {m.firstName} {m.lastName}
                        </span>
                        <span className="block truncate text-xs text-zinc-500">
                          {m.email}
                          {m.role ? ` · ${m.role}` : ''}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
                {filteredMembers.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-zinc-500">
                    No members match.
                  </li>
                )}
              </ul>
            </div>
          )}

          <fieldset>
            <legend className="text-sm font-medium text-zinc-900">
              Send timing
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer gap-3 rounded-lg px-3 py-2 ring-1 hover:bg-zinc-50 ${
                  mode === 'now' ? 'bg-zinc-50 ring-zinc-950' : 'ring-zinc-200'
                }`}
              >
                <input
                  type="radio"
                  name="draft-mode"
                  checked={mode === 'now'}
                  onChange={() => setMode('now')}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-950">
                    Send now
                  </span>
                  <span className="block text-xs text-zinc-500">
                    Queue immediately via Resend.
                  </span>
                </span>
              </label>
              <label
                className={`flex cursor-pointer gap-3 rounded-lg px-3 py-2 ring-1 hover:bg-zinc-50 ${
                  mode === 'schedule'
                    ? 'bg-zinc-50 ring-zinc-950'
                    : 'ring-zinc-200'
                }`}
              >
                <input
                  type="radio"
                  name="draft-mode"
                  checked={mode === 'schedule'}
                  onChange={() => setMode('schedule')}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-950">
                    Schedule
                  </span>
                  <span className="block text-xs text-zinc-500">
                    Pick a future local date &amp; time.
                  </span>
                </span>
              </label>
            </div>
            {mode === 'schedule' && (
              <input
                type="datetime-local"
                value={scheduledLocal}
                onChange={(e) => setScheduledLocal(e.target.value)}
                className={`mt-3 ${inputClass}`}
              />
            )}
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!canSend}
              onClick={() => setConfirmOpen(true)}
              className="rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {mode === 'schedule' ? 'Schedule send' : 'Send campaign'}
            </button>
            <p className="text-sm text-zinc-500">
              {recipientCount} recipient{recipientCount === 1 ? '' : 's'}
            </p>
          </div>

          {sendResult && 'error' in sendResult && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {sendResult.error}
            </p>
          )}
          {sendResult && 'success' in sendResult && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {sendResult.scheduled
                ? `Scheduled ${sendResult.queued} email${sendResult.queued === 1 ? '' : 's'} for ${formatWhen(sendResult.scheduledAt)}.`
                : `Queued ${sendResult.queued} email${sendResult.queued === 1 ? '' : 's'} with Resend.`}
            </p>
          )}
        </div>
      </section>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-950">
              Confirm {mode === 'schedule' ? 'schedule' : 'send'}
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              This will {mode === 'schedule' ? 'schedule' : 'send'}{' '}
              <strong className="font-semibold text-zinc-900">
                {selectedSendTemplate?.name ?? 'the selected template'}
              </strong>{' '}
              to{' '}
              <strong className="font-semibold text-zinc-900">
                {recipientCount}
              </strong>{' '}
              recipient{recipientCount === 1 ? '' : 's'}
              {mode === 'schedule' && scheduledLocal
                ? ` at ${formatWhen(new Date(scheduledLocal).toISOString())}`
                : ''}
              .
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={submitSend}
                className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {pending
                  ? 'Working…'
                  : mode === 'schedule'
                    ? 'Confirm schedule'
                    : 'Confirm send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputClass =
  'mt-1.5 w-full rounded-lg border-0 px-3 py-2 text-sm shadow-sm ring-1 ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-950'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="text-sm font-medium text-zinc-900">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: 'draft' | 'published' }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize ${
        status === 'published'
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-amber-50 text-amber-800'
      }`}
    >
      {status}
    </span>
  )
}

function formatWhen(iso?: string) {
  if (!iso) return 'the selected time'
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}
