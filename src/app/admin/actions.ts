'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
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
  await requireStaff()
  const supabase = createClient()

  const { error } = await supabase
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
