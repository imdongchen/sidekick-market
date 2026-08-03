'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/supabase/admin'
import { requireStaff } from '@/supabase/auth'
import { createClient } from '@/supabase/server'
import type { Role, Status } from '@/types/database'

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export type UpdateMemberInput = {
  id: number
  firstName: string
  lastName: string
  email: string
  birthday: string | null
  usmsId: string | null
  role: Role | null
  status: Status
  slug: string
}

export async function updateMember(input: UpdateMemberInput) {
  const staff = await requireStaff()

  const admin = createAdminClient()

  // Coaches can only edit members on their team; admins can edit anyone.
  if (staff.role === 'coach') {
    const { data: existing } = await admin
      .from('profile')
      .select('teamId')
      .eq('id', input.id)
      .single()

    if (!existing || existing.teamId !== staff.teamId) {
      return { error: 'You can only edit members on your team.' }
    }
  }

  const { error } = await admin
    .from('profile')
    .update({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      birthday: input.birthday || null,
      usmsId: input.usmsId?.trim() || null,
      role: input.role,
      status: input.status,
      slug: input.slug.trim(),
      updatedAt: new Date().toISOString(),
    })
    .eq('id', input.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/members')
  revalidatePath(`/admin/members/${input.id}`)
  return { success: true }
}
