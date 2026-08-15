import type { MemberEngagement } from '@/lib/engagement-shared'

function formatMetric(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined) return '—'
  if (digits > 0) return value.toFixed(digits)
  return String(value)
}

export function MemberEngagementStats({
  engagement,
  compact = false,
}: {
  engagement: MemberEngagement
  compact?: boolean
}) {
  const items = [
    { label: 'Check-ins', value: formatMetric(engagement.checkIns) },
    { label: 'This month', value: formatMetric(engagement.monthlyCheckIns) },
    {
      label: 'Sessions (7d)',
      value: formatMetric(engagement.weeklySessions),
    },
    {
      label: 'Hours (7d)',
      value: formatMetric(engagement.weeklyHours, 1),
    },
  ]

  if (compact) {
    return (
      <>
        {items.map((item) => (
          <td
            key={item.label}
            className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-600"
            title={item.label}
          >
            {item.value}
          </td>
        ))}
      </>
    )
  }

  return (
    <div className="mt-8 max-w-xl">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Engagement
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg bg-zinc-50 px-3 py-3 ring-1 ring-zinc-200"
          >
            <dt className="text-xs font-medium text-zinc-500">{item.label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-zinc-950">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      {engagement.weeklySessions === null && (
        <p className="mt-2 text-xs text-zinc-500">
          Weekly usage could not be loaded from PostHog.
        </p>
      )}
    </div>
  )
}
