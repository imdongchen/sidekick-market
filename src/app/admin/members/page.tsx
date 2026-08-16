import { MembersTable } from '@/components/admin/members-table'
import { getCheckInEngagementByUserIds } from '@/lib/engagement'
import { requireStaff } from '@/supabase/auth'
import { createClient } from '@/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Members',
}

type SearchParams = { q?: string; status?: string }

export default async function MembersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireStaff()
  const supabase = createClient()
  const q = searchParams.q?.trim() ?? ''
  const status = searchParams.status?.trim() ?? ''

  let query = supabase
    .from('profile')
    .select(
      'id, firstName, lastName, email, birthday, usmsId, role, status, teamId, slug, createdAt, userId',
    )
    .order('lastName', { ascending: true })
    .order('firstName', { ascending: true })
    .limit(200)

  if (status) {
    query = query.eq(
      'status',
      status as 'active' | 'deactivated' | 'pending' | 'invited',
    )
  }

  if (q) {
    const safe = q.replace(/[%_,]/g, '')
    if (safe) {
      query = query.or(
        `firstName.ilike.%${safe}%,lastName.ilike.%${safe}%,email.ilike.%${safe}%,usmsId.ilike.%${safe}%`,
      )
    }
  }

  const { data: members, error } = await query

  const teamIds = [
    ...new Set((members ?? []).map((m) => m.teamId).filter(Boolean)),
  ] as number[]

  const [{ data: teams }, engagementByUser] = await Promise.all([
    teamIds.length > 0
      ? supabase.from('team').select('id, name').in('id', teamIds)
      : Promise.resolve({ data: [] as { id: number; name: string }[] }),
    getCheckInEngagementByUserIds((members ?? []).map((m) => m.userId)),
  ])

  const teamName: Record<string, string> = {}
  for (const t of teams ?? []) {
    teamName[String(t.id)] = t.name
  }
  const showTeam = teamIds.length > 1

  const checkInsByUser: Record<
    string,
    { checkIns: number; monthlyCheckIns: number }
  > = {}
  for (const [userId, e] of engagementByUser) {
    checkInsByUser[userId] = {
      checkIns: e.checkIns,
      monthlyCheckIns: e.monthlyCheckIns,
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Members
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Members visible to your account (team-scoped by RLS), with check-in
            and weekly usage metrics.
          </p>
        </div>
        <form className="flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, email, USMS…"
            className="min-w-[12rem] flex-1 rounded-lg border-0 px-3 py-2 text-sm shadow-sm ring-1 ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-950"
          />
          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border-0 bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-950"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="invited">Invited</option>
            <option value="deactivated">Deactivated</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Filter
          </button>
        </form>
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
        <MembersTable
          members={(members ?? []).map((m) => ({
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
            email: m.email,
            usmsId: m.usmsId,
            birthday: m.birthday,
            role: m.role,
            status: m.status,
            teamId: m.teamId,
            userId: m.userId,
          }))}
          checkInsByUser={checkInsByUser}
          teamName={teamName}
          showTeam={showTeam}
        />
      </div>
    </div>
  )
}
