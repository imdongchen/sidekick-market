'use client'

import { MemberEngagementStats } from '@/components/admin/member-engagement-stats'
import { MemberWeeklyUsageProvider } from '@/components/admin/member-engagement-with-usage'
import { Link } from '@/components/link'
import type { MemberEngagement } from '@/lib/engagement-shared'
import { emptyEngagement } from '@/lib/engagement-shared'

export type MemberRow = {
  id: number
  firstName: string
  lastName: string
  email: string
  usmsId: string | null
  birthday: string | null
  role: string | null
  status: string
  teamId: number | null
  userId: string | null
}

export function MembersTable({
  members,
  checkInsByUser,
  teamName,
  showTeam,
}: {
  members: MemberRow[]
  checkInsByUser: Record<string, Pick<MemberEngagement, 'checkIns' | 'monthlyCheckIns'>>
  teamName: Record<string, string>
  showTeam: boolean
}) {
  const userIds = members
    .map((m) => m.userId)
    .filter((id): id is string => !!id)

  return (
    <MemberWeeklyUsageProvider userIds={userIds}>
      {(usageByUser) => (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">USMS</th>
                <th className="px-4 py-3">Birthday</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                {showTeam && <th className="px-4 py-3">Team</th>}
                <th className="px-4 py-3 text-right">Check-ins</th>
                <th className="px-4 py-3 text-right">Monthly</th>
                <th className="px-4 py-3 text-right">Sessions</th>
                <th className="px-4 py-3 text-right">Hours</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {members.map((m) => {
                const checkIns = m.userId
                  ? checkInsByUser[m.userId]
                  : undefined
                const usage = m.userId ? usageByUser.get(m.userId) : undefined
                const engagement: MemberEngagement = {
                  ...(m.userId
                    ? {
                        checkIns: checkIns?.checkIns ?? 0,
                        monthlyCheckIns: checkIns?.monthlyCheckIns ?? 0,
                      }
                    : emptyEngagement()),
                  weeklySessions: usage ? usage.weeklySessions : null,
                  weeklyHours: usage ? usage.weeklyHours : null,
                }
                return (
                  <tr key={m.id} className="hover:bg-zinc-50/80">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-950">
                      {m.firstName} {m.lastName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                      {m.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                      {m.usmsId || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                      {m.birthday || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                      {m.role || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={m.status} />
                    </td>
                    {showTeam && (
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                        {m.teamId
                          ? teamName[String(m.teamId)] ?? m.teamId
                          : '—'}
                      </td>
                    )}
                    <MemberEngagementStats engagement={engagement} compact />
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        href={`/admin/members/${m.id}`}
                        className="font-medium text-zinc-950 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {members.length === 0 && (
                <tr>
                  <td
                    colSpan={showTeam ? 12 : 11}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </MemberWeeklyUsageProvider>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    pending: 'bg-amber-50 text-amber-700',
    invited: 'bg-sky-50 text-sky-700',
    deactivated: 'bg-zinc-100 text-zinc-600',
  }
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize ${colors[status] ?? 'bg-zinc-100 text-zinc-600'}`}
    >
      {status}
    </span>
  )
}
