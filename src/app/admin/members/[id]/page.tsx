import { MemberEditForm } from '@/components/admin/member-edit-form'
import { Link } from '@/components/link'
import { createAdminClient } from '@/supabase/admin'
import { requireStaff } from '@/supabase/auth'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Edit member',
}

export default async function MemberEditPage({
  params,
}: {
  params: { id: string }
}) {
  const staff = await requireStaff()
  const id = Number(params.id)
  if (!Number.isFinite(id)) notFound()

  const admin = createAdminClient()
  const { data: member } = await admin
    .from('profile')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!member) notFound()

  if (staff.role === 'coach' && member.teamId !== staff.teamId) {
    notFound()
  }

  let teamName: string | null = null
  if (member.teamId) {
    const { data: team } = await admin
      .from('team')
      .select('name')
      .eq('id', member.teamId)
      .maybeSingle()
    teamName = team?.name ?? null
  }

  return (
    <div>
      <p className="text-sm text-zinc-500">
        <Link href="/admin/members" className="hover:text-zinc-950">
          Members
        </Link>
        <span className="mx-2">/</span>
        Edit
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
        {member.firstName} {member.lastName}
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        {teamName ? `Team: ${teamName}` : 'No team'}
        {member.userId ? '' : ' · No auth account linked'}
      </p>
      <MemberEditForm member={member} />
    </div>
  )
}
