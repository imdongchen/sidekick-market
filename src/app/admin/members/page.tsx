import { Link } from '@/components/link'
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
      'id, firstName, lastName, email, birthday, usmsId, role, status, teamId, slug, createdAt',
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

  const { data: teams } =
    teamIds.length > 0
      ? await supabase.from('team').select('id, name').in('id', teamIds)
      : { data: [] }

  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]))
  const showTeam = teamIds.length > 1

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Members
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Members visible to your account (team-scoped by RLS).
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
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(members ?? []).map((m) => (
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
                      {m.teamId ? teamName.get(m.teamId) ?? m.teamId : '—'}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link
                      href={`/admin/members/${m.id}`}
                      className="font-medium text-zinc-950 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {(members ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={showTeam ? 8 : 7}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
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
