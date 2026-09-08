'use client'

import { MemberEngagementStats } from '@/components/admin/member-engagement-stats'
import { MemberWeeklyUsageProvider } from '@/components/admin/member-engagement-with-usage'
import { Link } from '@/components/link'
import type { MemberEngagement } from '@/lib/engagement-shared'
import { emptyEngagement } from '@/lib/engagement-shared'
import {
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/16/solid'
import { clsx } from 'clsx'
import { useMemo, useState } from 'react'

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

type Usage = { weeklySessions: number; weeklyHours: number }

type SortKey =
  | 'name'
  | 'email'
  | 'usmsId'
  | 'birthday'
  | 'role'
  | 'status'
  | 'team'
  | 'checkIns'
  | 'monthlyCheckIns'
  | 'weeklySessions'
  | 'weeklyHours'

type SortDir = 'asc' | 'desc'

type ColumnFilters = {
  name: string
  email: string
  usmsId: string
  birthday: string
  role: string
  status: string
  team: string
  checkIns: string
  monthlyCheckIns: string
  weeklySessions: string
  weeklyHours: string
}

const EMPTY_FILTERS: ColumnFilters = {
  name: '',
  email: '',
  usmsId: '',
  birthday: '',
  role: '',
  status: '',
  team: '',
  checkIns: '',
  monthlyCheckIns: '',
  weeklySessions: '',
  weeklyHours: '',
}

const NUMERIC_SORT = new Set<SortKey>([
  'checkIns',
  'monthlyCheckIns',
  'weeklySessions',
  'weeklyHours',
])

const STATUS_RANK: Record<string, number> = {
  active: 0,
  pending: 1,
  invited: 2,
  deactivated: 3,
}

const ROLE_RANK: Record<string, number> = {
  admin: 0,
  coach: 1,
  swimmer: 2,
}

const ROLE_OPTIONS = ['swimmer', 'coach', 'admin'] as const
const STATUS_OPTIONS = ['active', 'pending', 'invited', 'deactivated'] as const

const NONE = '__none__'

const filterControlClass =
  'w-full min-w-[4.5rem] rounded-md border-0 bg-white px-2 py-1 text-xs font-normal normal-case tracking-normal text-zinc-900 shadow-sm ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950'

export function MembersTable({
  members,
  checkInsByUser,
  teamName,
  showTeam,
}: {
  members: MemberRow[]
  checkInsByUser: Record<
    string,
    Pick<MemberEngagement, 'checkIns' | 'monthlyCheckIns'>
  >
  teamName: Record<string, string>
  showTeam: boolean
}) {
  const userIds = members
    .map((m) => m.userId)
    .filter((id): id is string => !!id)

  return (
    <MemberWeeklyUsageProvider userIds={userIds}>
      {(usageByUser) => (
        <MembersTableBody
          members={members}
          checkInsByUser={checkInsByUser}
          teamName={teamName}
          showTeam={showTeam}
          usageByUser={usageByUser}
        />
      )}
    </MemberWeeklyUsageProvider>
  )
}

function MembersTableBody({
  members,
  checkInsByUser,
  teamName,
  showTeam,
  usageByUser,
}: {
  members: MemberRow[]
  checkInsByUser: Record<
    string,
    Pick<MemberEngagement, 'checkIns' | 'monthlyCheckIns'>
  >
  teamName: Record<string, string>
  showTeam: boolean
  usageByUser: Map<string, Usage>
}) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [filters, setFilters] = useState<ColumnFilters>(EMPTY_FILTERS)

  const teamOptions = useMemo(() => {
    const names = new Set<string>()
    let hasNone = false
    for (const m of members) {
      if (!m.teamId) {
        hasNone = true
        continue
      }
      names.add(teamName[String(m.teamId)] ?? String(m.teamId))
    }
    return {
      names: [...names].sort((a, b) => a.localeCompare(b)),
      hasNone,
    }
  }, [members, teamName])

  const hasColumnFilters = useMemo(
    () => Object.values(filters).some((value) => value.trim() !== ''),
    [filters],
  )

  const visibleMembers = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const filtered = members.filter((m) =>
      matchesFilters(m, filters, checkInsByUser, usageByUser, teamName),
    )
    return [...filtered].sort((a, b) =>
      compareMembers(a, b, sortKey, dir, checkInsByUser, usageByUser, teamName),
    )
  }, [
    members,
    filters,
    sortKey,
    sortDir,
    checkInsByUser,
    usageByUser,
    teamName,
  ])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(NUMERIC_SORT.has(key) ? 'desc' : 'asc')
  }

  function setFilter<K extends keyof ColumnFilters>(key: K, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const colSpan = showTeam ? 12 : 11

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-2.5">
        <p className="text-sm text-zinc-600">
          {hasColumnFilters ? (
            <>
              Showing{' '}
              <span className="font-medium text-zinc-950">
                {visibleMembers.length}
              </span>{' '}
              of {members.length} members
            </>
          ) : (
            <>
              <span className="font-medium text-zinc-950">
                {members.length}
              </span>{' '}
              {members.length === 1 ? 'member' : 'members'}
            </>
          )}
        </p>
        {hasColumnFilters && (
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="text-sm font-medium text-zinc-950 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr>
              <SortableHeader
                label="Name"
                column="name"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Email"
                column="email"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <SortableHeader
                label="USMS"
                column="usmsId"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Birthday"
                column="birthday"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Role"
                column="role"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Status"
                column="status"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              {showTeam && (
                <SortableHeader
                  label="Team"
                  column="team"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
              )}
              <SortableHeader
                label="Check-ins"
                column="checkIns"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                align="right"
              />
              <SortableHeader
                label="Monthly"
                column="monthlyCheckIns"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                align="right"
              />
              <SortableHeader
                label="Sessions"
                column="weeklySessions"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                align="right"
              />
              <SortableHeader
                label="Hours"
                column="weeklyHours"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                align="right"
              />
              <th className="px-4 py-3" />
            </tr>
            {members.length > 0 && (
              <tr className="border-b border-zinc-100 bg-white">
                <th className="px-4 py-2 font-normal">
                  <TextFilter
                    label="Filter by name"
                    value={filters.name}
                    onChange={(value) => setFilter('name', value)}
                  />
                </th>
                <th className="px-4 py-2 font-normal">
                  <TextFilter
                    label="Filter by email"
                    value={filters.email}
                    onChange={(value) => setFilter('email', value)}
                  />
                </th>
                <th className="px-4 py-2 font-normal">
                  <TextFilter
                    label="Filter by USMS ID"
                    value={filters.usmsId}
                    onChange={(value) => setFilter('usmsId', value)}
                  />
                </th>
                <th className="px-4 py-2 font-normal">
                  <TextFilter
                    label="Filter by birthday"
                    value={filters.birthday}
                    onChange={(value) => setFilter('birthday', value)}
                  />
                </th>
                <th className="px-4 py-2 font-normal">
                  <SelectFilter
                    label="Filter by role"
                    value={filters.role}
                    onChange={(value) => setFilter('role', value)}
                    options={[
                      ...ROLE_OPTIONS.map((role) => ({
                        value: role,
                        label: capitalize(role),
                      })),
                      { value: NONE, label: '—' },
                    ]}
                  />
                </th>
                <th className="px-4 py-2 font-normal">
                  <SelectFilter
                    label="Filter by status"
                    value={filters.status}
                    onChange={(value) => setFilter('status', value)}
                    options={STATUS_OPTIONS.map((status) => ({
                      value: status,
                      label: capitalize(status),
                    }))}
                  />
                </th>
                {showTeam && (
                  <th className="px-4 py-2 font-normal">
                    <SelectFilter
                      label="Filter by team"
                      value={filters.team}
                      onChange={(value) => setFilter('team', value)}
                      options={[
                        ...teamOptions.names.map((name) => ({
                          value: name,
                          label: name,
                        })),
                        ...(teamOptions.hasNone
                          ? [{ value: NONE, label: '—' }]
                          : []),
                      ]}
                    />
                  </th>
                )}
                <th className="px-4 py-2 font-normal">
                  <MinFilter
                    label="Minimum check-ins"
                    value={filters.checkIns}
                    onChange={(value) => setFilter('checkIns', value)}
                  />
                </th>
                <th className="px-4 py-2 font-normal">
                  <MinFilter
                    label="Minimum monthly check-ins"
                    value={filters.monthlyCheckIns}
                    onChange={(value) => setFilter('monthlyCheckIns', value)}
                  />
                </th>
                <th className="px-4 py-2 font-normal">
                  <MinFilter
                    label="Minimum weekly sessions"
                    value={filters.weeklySessions}
                    onChange={(value) => setFilter('weeklySessions', value)}
                  />
                </th>
                <th className="px-4 py-2 font-normal">
                  <MinFilter
                    label="Minimum weekly hours"
                    value={filters.weeklyHours}
                    onChange={(value) => setFilter('weeklyHours', value)}
                  />
                </th>
                <th className="px-4 py-2" />
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {visibleMembers.map((m) => {
              const checkIns = m.userId ? checkInsByUser[m.userId] : undefined
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
                        ? (teamName[String(m.teamId)] ?? m.teamId)
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
            {visibleMembers.length === 0 && (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-10 text-center text-zinc-500"
                >
                  {members.length === 0
                    ? 'No members found.'
                    : 'No members match these filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SortableHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  align = 'left',
}: {
  label: string
  column: SortKey
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = sortKey === column
  const Icon = !active
    ? ChevronUpDownIcon
    : sortDir === 'asc'
      ? ChevronUpIcon
      : ChevronDownIcon

  return (
    <th
      className="px-4 py-3"
      aria-sort={
        active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
      }
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={clsx(
          '-mx-1 inline-flex w-full items-center gap-1 rounded-md px-1 py-0.5 hover:text-zinc-950',
          align === 'right' && 'justify-end',
        )}
      >
        {label}
        <Icon
          className={clsx(
            'size-3.5 shrink-0',
            active ? 'text-zinc-950' : 'text-zinc-300',
          )}
          aria-hidden="true"
        />
        <span className="sr-only">
          {active
            ? `Sorted ${sortDir === 'asc' ? 'ascending' : 'descending'}. Activate to reverse.`
            : 'Activate to sort.'}
        </span>
      </button>
    </th>
  )
}

function TextFilter({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      placeholder="Filter"
      className={filterControlClass}
    />
  )
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={filterControlClass}
    >
      <option value="">All</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function MinFilter({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <input
      type="number"
      min={0}
      step="any"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      placeholder="Min"
      className={clsx(filterControlClass, 'text-right')}
    />
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

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function contains(haystack: string | null | undefined, needle: string) {
  if (!needle.trim()) return true
  return (haystack ?? '').toLowerCase().includes(needle.trim().toLowerCase())
}

function meetsMin(value: number | null | undefined, minRaw: string) {
  const trimmed = minRaw.trim()
  if (!trimmed) return true
  const min = Number(trimmed)
  if (!Number.isFinite(min)) return true
  if (value == null) return false
  return value >= min
}

function rowTeamName(
  member: MemberRow,
  teamName: Record<string, string>,
): string {
  if (!member.teamId) return ''
  return teamName[String(member.teamId)] ?? String(member.teamId)
}

function rowMetrics(
  member: MemberRow,
  checkInsByUser: Record<
    string,
    Pick<MemberEngagement, 'checkIns' | 'monthlyCheckIns'>
  >,
  usageByUser: Map<string, Usage>,
) {
  if (!member.userId) {
    return {
      checkIns: 0,
      monthlyCheckIns: 0,
      weeklySessions: null as number | null,
      weeklyHours: null as number | null,
    }
  }
  const checkIns = checkInsByUser[member.userId]
  const usage = usageByUser.get(member.userId)
  return {
    checkIns: checkIns?.checkIns ?? 0,
    monthlyCheckIns: checkIns?.monthlyCheckIns ?? 0,
    weeklySessions: usage ? usage.weeklySessions : null,
    weeklyHours: usage ? usage.weeklyHours : null,
  }
}

function matchesFilters(
  member: MemberRow,
  filters: ColumnFilters,
  checkInsByUser: Record<
    string,
    Pick<MemberEngagement, 'checkIns' | 'monthlyCheckIns'>
  >,
  usageByUser: Map<string, Usage>,
  teamName: Record<string, string>,
) {
  if (!contains(`${member.firstName} ${member.lastName}`, filters.name)) {
    return false
  }
  if (!contains(member.email, filters.email)) return false
  if (!contains(member.usmsId, filters.usmsId)) return false
  if (!contains(member.birthday, filters.birthday)) return false

  if (filters.role === NONE) {
    if (member.role) return false
  } else if (filters.role && member.role !== filters.role) {
    return false
  }

  if (filters.status && member.status !== filters.status) return false

  const team = rowTeamName(member, teamName)
  if (filters.team === NONE) {
    if (team) return false
  } else if (filters.team && team !== filters.team) {
    return false
  }

  const metrics = rowMetrics(member, checkInsByUser, usageByUser)
  if (!meetsMin(metrics.checkIns, filters.checkIns)) return false
  if (!meetsMin(metrics.monthlyCheckIns, filters.monthlyCheckIns)) return false
  if (!meetsMin(metrics.weeklySessions, filters.weeklySessions)) return false
  if (!meetsMin(metrics.weeklyHours, filters.weeklyHours)) return false

  return true
}

function emptyLast(aEmpty: boolean, bEmpty: boolean): number | null {
  if (aEmpty === bEmpty) return aEmpty ? 0 : null
  return aEmpty ? 1 : -1
}

function compareStrings(a: string, b: string, dir: number) {
  const empty = emptyLast(!a, !b)
  if (empty != null) return empty
  return (
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }) * dir
  )
}

function compareNumbers(
  a: number | null | undefined,
  b: number | null | undefined,
  dir: number,
) {
  const empty = emptyLast(a == null, b == null)
  if (empty != null) return empty
  return ((a as number) - (b as number)) * dir
}

function compareMembers(
  a: MemberRow,
  b: MemberRow,
  sortKey: SortKey,
  dir: number,
  checkInsByUser: Record<
    string,
    Pick<MemberEngagement, 'checkIns' | 'monthlyCheckIns'>
  >,
  usageByUser: Map<string, Usage>,
  teamName: Record<string, string>,
) {
  const aMetrics = rowMetrics(a, checkInsByUser, usageByUser)
  const bMetrics = rowMetrics(b, checkInsByUser, usageByUser)

  let result = 0
  switch (sortKey) {
    case 'name':
      result = compareStrings(
        `${a.lastName} ${a.firstName}`,
        `${b.lastName} ${b.firstName}`,
        dir,
      )
      break
    case 'email':
      result = compareStrings(a.email, b.email, dir)
      break
    case 'usmsId':
      result = compareStrings(a.usmsId ?? '', b.usmsId ?? '', dir)
      break
    case 'birthday':
      result = compareStrings(a.birthday ?? '', b.birthday ?? '', dir)
      break
    case 'role':
      result = compareNumbers(
        a.role ? (ROLE_RANK[a.role] ?? 99) : null,
        b.role ? (ROLE_RANK[b.role] ?? 99) : null,
        dir,
      )
      break
    case 'status':
      result = compareNumbers(
        STATUS_RANK[a.status] ?? 99,
        STATUS_RANK[b.status] ?? 99,
        dir,
      )
      break
    case 'team':
      result = compareStrings(
        rowTeamName(a, teamName),
        rowTeamName(b, teamName),
        dir,
      )
      break
    case 'checkIns':
      result = compareNumbers(aMetrics.checkIns, bMetrics.checkIns, dir)
      break
    case 'monthlyCheckIns':
      result = compareNumbers(
        aMetrics.monthlyCheckIns,
        bMetrics.monthlyCheckIns,
        dir,
      )
      break
    case 'weeklySessions':
      result = compareNumbers(
        aMetrics.weeklySessions,
        bMetrics.weeklySessions,
        dir,
      )
      break
    case 'weeklyHours':
      result = compareNumbers(aMetrics.weeklyHours, bMetrics.weeklyHours, dir)
      break
  }

  if (result !== 0) return result
  return compareStrings(
    `${a.lastName} ${a.firstName}`,
    `${b.lastName} ${b.firstName}`,
    1,
  )
}
