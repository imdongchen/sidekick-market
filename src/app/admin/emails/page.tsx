import {
  listResendTemplates,
  type ResendTemplateSummary,
} from '@/app/admin/emails/template-actions'
import { EmailComposer } from '@/components/admin/email-composer'
import { EmailDraftComposer } from '@/components/admin/email-draft-composer'
import { EmailsTabs } from '@/components/admin/emails-tabs'
import { MonthlyReviewComposer } from '@/components/admin/monthly-review-composer'
import { DEMO_RESEND_TEMPLATES } from '@/lib/admin-demo-data'
import { isAdminDemoMode } from '@/lib/admin-demo-server'
import { loadMonthlyReviewHtml } from '@/lib/emails/monthly-swim-review.server'
import { loadReintroduceHtml } from '@/lib/emails/reintroduce-sidekick.server'
import { requireStaff } from '@/supabase/auth'
import { createClient } from '@/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Emails',
}

type SearchParams = { q?: string; event?: string; tab?: string }

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireStaff()
  const supabase = createClient()
  const q = searchParams.q?.trim() ?? ''
  const event = searchParams.event?.trim() ?? ''
  const tab =
    searchParams.tab === 'draft'
      ? 'draft'
      : searchParams.tab === 'monthly'
        ? 'monthly'
        : 'campaign'

  const demo = isAdminDemoMode()
  const resendConfigured = demo || !!process.env.RESEND_API_KEY

  const [
    templateHtml,
    monthlyTemplateHtml,
    membersResult,
    eventsResult,
    templatesResult,
  ] = await Promise.all([
    loadReintroduceHtml(),
    loadMonthlyReviewHtml(),
    supabase
      .from('profile')
      .select('id, firstName, lastName, email, role, status')
      .neq('status', 'deactivated')
      .order('lastName', { ascending: true })
      .order('firstName', { ascending: true })
      .limit(1000),
    (() => {
      let query = supabase
        .from('email_tracking')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(300)
      if (q) {
        query = query.ilike('recipientEmail', `%${q}%`)
      }
      if (event) {
        query = query.eq('eventType', event)
      }
      return query
    })(),
    demo
      ? Promise.resolve({ templates: DEMO_RESEND_TEMPLATES })
      : resendConfigured
        ? listResendTemplates()
        : Promise.resolve({ templates: [] as ResendTemplateSummary[] }),
  ])

  const members = (membersResult.data ?? []).filter((m) => !!m.email)
  const events = eventsResult.data
  const eventsError = eventsResult.error
  const templates =
    templatesResult && 'templates' in templatesResult
      ? templatesResult.templates
      : []
  const templatesError =
    templatesResult && 'error' in templatesResult
      ? templatesResult.error
      : undefined

  const byEmail = new Map<
    string,
    {
      emailId: string
      recipientEmail: string
      year: string | null
      userId: string | null
      events: { type: string; at: string }[]
      latestAt: string
    }
  >()

  for (const row of events ?? []) {
    const existing = byEmail.get(row.emailId)
    if (!existing) {
      byEmail.set(row.emailId, {
        emailId: row.emailId,
        recipientEmail: row.recipientEmail,
        year: row.year,
        userId: row.userId,
        events: [{ type: row.eventType, at: row.timestamp }],
        latestAt: row.timestamp,
      })
    } else {
      existing.events.push({ type: row.eventType, at: row.timestamp })
    }
  }

  const emails = [...byEmail.values()].sort((a, b) =>
    b.latestAt.localeCompare(a.latestAt),
  )

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Emails
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          Draft new emails with the Sidekick template on Resend, send the
          monthly swim review or re-introduction campaign, or review delivery
          events in <code className="text-xs">email_tracking</code>.
        </p>
      </div>

      <EmailsTabs active={tab} />

      {tab === 'draft' ? (
        <EmailDraftComposer
          members={members}
          templates={templates}
          templatesError={templatesError}
          resendConfigured={resendConfigured}
        />
      ) : tab === 'monthly' ? (
        <MonthlyReviewComposer
          templateHtml={monthlyTemplateHtml}
          members={members}
          resendConfigured={resendConfigured}
        />
      ) : (
        <EmailComposer
          templateHtml={templateHtml}
          members={members}
          resendConfigured={resendConfigured}
        />
      )}

      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Send history
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Recent events from Resend webhooks and campaign queues.
            </p>
          </div>
          <form className="flex flex-wrap gap-2">
            <input type="hidden" name="tab" value={tab} />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search recipient…"
              className="min-w-[12rem] flex-1 rounded-lg border-0 px-3 py-2 text-sm shadow-sm ring-1 ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-950"
            />
            <select
              name="event"
              defaultValue={event}
              className="rounded-lg border-0 bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-950"
            >
              <option value="">All events</option>
              <option value="email.scheduled">Scheduled</option>
              <option value="email.sent">Sent</option>
              <option value="email.delivered">Delivered</option>
              <option value="email.opened">Opened</option>
              <option value="email.clicked">Clicked</option>
              <option value="email.bounced">Bounced</option>
              <option value="email.complained">Complained</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Filter
            </button>
          </form>
        </div>

        {eventsError && (
          <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {eventsError.message}
          </p>
        )}

        <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Events</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Latest</th>
                  <th className="px-4 py-3">Resend ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {emails.map((email) => (
                  <tr key={email.emailId} className="hover:bg-zinc-50/80">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-950">
                      {email.recipientEmail}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(email.events.map((e) => e.type))].map(
                          (type) => (
                            <EventBadge key={type} type={type} />
                          ),
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                      {email.year || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                      {formatDate(email.latestAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-400">
                      {email.emailId}
                    </td>
                  </tr>
                ))}
                {emails.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-zinc-500"
                    >
                      No email events found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}

function EventBadge({ type }: { type: string }) {
  const label = type.replace('email.', '')
  const colors: Record<string, string> = {
    scheduled: 'bg-indigo-50 text-indigo-700',
    sent: 'bg-zinc-100 text-zinc-700',
    delivered: 'bg-emerald-50 text-emerald-700',
    opened: 'bg-sky-50 text-sky-700',
    clicked: 'bg-violet-50 text-violet-700',
    bounced: 'bg-red-50 text-red-700',
    complained: 'bg-amber-50 text-amber-700',
  }
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize ${colors[label] ?? 'bg-zinc-100 text-zinc-600'}`}
    >
      {label}
    </span>
  )
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}
