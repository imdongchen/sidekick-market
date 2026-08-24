'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  fetchMonthlyReviewStats,
  sendMonthlyReviewCampaign,
  type EmailAudience,
  type SendMonthlyReviewResult,
} from '@/app/admin/emails/monthly-actions'
import {
  formatReviewMonthName,
  formatSwimCount,
  defaultReviewMonthValue,
} from '@/lib/monthly-swim-stats-shared'
import {
  monthlyReviewSubject,
  personalizeMonthlyReviewEmail,
} from '@/lib/emails/monthly-swim-review'
import type { ComposerMember } from '@/components/admin/email-composer'

type Props = {
  templateHtml: string
  members: ComposerMember[]
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

export function MonthlyReviewComposer({
  templateHtml,
  members,
  resendConfigured,
}: Props) {
  const [audience, setAudience] = useState<EmailAudience>('all_members')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [month, setMonth] = useState(defaultReviewMonthValue)
  const [teamCheckIns, setTeamCheckIns] = useState<number | null>(null)
  const [teamMiles, setTeamMiles] = useState<string | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [previewNoCheckIns, setPreviewNoCheckIns] = useState(false)
  const [mode, setMode] = useState<'now' | 'schedule'>('now')
  const [scheduledLocal, setScheduledLocal] = useState('')
  const [memberQuery, setMemberQuery] = useState('')
  const [result, setResult] = useState<SendMonthlyReviewResult | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const monthName = formatReviewMonthName(month)
  const coachCount = members.filter((m) => m.role === 'coach').length

  useEffect(() => {
    let cancelled = false
    setStatsLoading(true)
    setStatsError(null)
    fetchMonthlyReviewStats(month).then((response) => {
      if (cancelled) return
      if ('error' in response) {
        setStatsError(response.error)
        setTeamCheckIns(null)
        setTeamMiles(null)
      } else {
        setTeamCheckIns(response.teamCheckIns)
        setTeamMiles(response.teamMiles)
      }
      setStatsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [month])

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

  const subject = monthlyReviewSubject(monthName)

  const previewHtml = useMemo(
    () =>
      personalizeMonthlyReviewEmail(templateHtml, {
        firstName: 'Alex',
        monthName,
        teamCheckIns:
          teamCheckIns != null ? formatSwimCount(teamCheckIns) : '—',
        teamMiles: teamMiles ?? '—',
        userCheckIns: previewNoCheckIns ? 0 : 6,
        userMiles: previewNoCheckIns ? '0' : '2.1',
        hasNoCheckIns: previewNoCheckIns,
      }),
    [
      templateHtml,
      monthName,
      teamCheckIns,
      teamMiles,
      previewNoCheckIns,
    ],
  )

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

  function clearSelection() {
    setSelectedIds([])
  }

  function submit() {
    setResult(null)
    startTransition(async () => {
      const response = await sendMonthlyReviewCampaign({
        audience,
        memberIds: audience === 'individuals' ? selectedIds : undefined,
        month,
        mode,
        scheduledAt:
          mode === 'schedule' && scheduledLocal
            ? new Date(scheduledLocal).toISOString()
            : undefined,
      })
      setResult(response)
      setConfirmOpen(false)
    })
  }

  const statsReady = teamCheckIns != null && teamMiles != null && !statsLoading

  const canSubmit =
    resendConfigured &&
    month.trim() &&
    statsReady &&
    recipientCount > 0 &&
    (mode === 'now' || !!scheduledLocal) &&
    !pending

  return (
    <div className="space-y-8">
      {!resendConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">Resend is not configured.</strong>{' '}
          Set <code className="text-xs">RESEND_API_KEY</code> (and optionally{' '}
          <code className="text-xs">RESEND_FROM</code>) on the server before
          sending.
        </div>
      )}

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="text-base font-semibold text-zinc-950">
            Monthly swim review
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Subject:{' '}
            <span className="font-medium text-zinc-900">{subject}</span>
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Team check-ins and miles are calculated from Supabase for the
            selected month. Recipients with no check-ins get a nudge to start
            logging; everyone else sees their personal totals.
          </p>
        </div>
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="space-y-5 border-b border-zinc-100 p-5 lg:border-b-0 lg:border-r">
            <div>
              <label className="text-sm font-medium text-zinc-900">Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="mt-1.5 w-full rounded-lg border-0 px-3 py-2 text-sm shadow-sm ring-1 ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-950"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Email title and copy use {monthName}.
              </p>
            </div>

            <div className="rounded-lg bg-zinc-50 px-3 py-3 text-sm text-zinc-700 ring-1 ring-zinc-200">
              <p className="font-medium text-zinc-900">Team totals (database)</p>
              {statsLoading && (
                <p className="mt-1 text-zinc-500">Loading swim stats…</p>
              )}
              {statsError && (
                <p className="mt-1 text-red-700">{statsError}</p>
              )}
              {statsReady && (
                <p className="mt-1">
                  {formatSwimCount(teamCheckIns)} check-ins · {teamMiles} miles
                </p>
              )}
            </div>

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
                        selected
                          ? 'bg-zinc-50 ring-zinc-950'
                          : 'ring-zinc-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="monthly-audience"
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
                    onClick={clearSelection}
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
                    mode === 'now'
                      ? 'bg-zinc-50 ring-zinc-950'
                      : 'ring-zinc-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="monthly-mode"
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
                    name="monthly-mode"
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
                  className="mt-3 w-full rounded-lg border-0 px-3 py-2 text-sm shadow-sm ring-1 ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                />
              )}
            </fieldset>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => setConfirmOpen(true)}
                className="rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {mode === 'schedule' ? 'Schedule send' : 'Send monthly review'}
              </button>
              <p className="text-sm text-zinc-500">
                {recipientCount} recipient{recipientCount === 1 ? '' : 's'}
              </p>
            </div>

            {result && 'error' in result && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {result.error}
              </p>
            )}
            {result && 'success' in result && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {result.scheduled
                  ? `Scheduled ${result.queued} email${result.queued === 1 ? '' : 's'} for ${formatWhen(result.scheduledAt)}.`
                  : `Queued ${result.queued} email${result.queued === 1 ? '' : 's'} with Resend.`}
              </p>
            )}
          </div>

          <div className="bg-zinc-50 p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-zinc-900">Preview</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Sample: Alex</span>
                <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                  <input
                    type="checkbox"
                    checked={previewNoCheckIns}
                    onChange={(e) => setPreviewNoCheckIns(e.target.checked)}
                  />
                  No check-ins variant
                </label>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
              <iframe
                title="Monthly review email preview"
                srcDoc={previewHtml}
                className="h-[36rem] w-full bg-white"
                sandbox=""
              />
            </div>
          </div>
        </div>
      </section>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-950">
              Confirm {mode === 'schedule' ? 'schedule' : 'send'}
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              This will {mode === 'schedule' ? 'schedule' : 'send'} the{' '}
              {monthName} swim review to{' '}
              <strong className="font-semibold text-zinc-900">
                {recipientCount}
              </strong>{' '}
              recipient{recipientCount === 1 ? '' : 's'}
              {mode === 'schedule' && scheduledLocal
                ? ` at ${formatWhen(new Date(scheduledLocal).toISOString())}`
                : ''}
              . Team totals:{' '}
              {statsReady
                ? `${formatSwimCount(teamCheckIns)} check-ins, ${teamMiles} miles`
                : 'loading…'}
              . Members with no check-ins this month get a start-checking-in
              nudge.
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
                onClick={submit}
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
