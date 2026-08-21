'use server'

import { DEMO_COOKIE_NAME, demoCookieOptions } from '@/lib/admin-demo'
import { isAdminDemoMode } from '@/lib/admin-demo-server'
import { requireStaff } from '@/supabase/auth'
import { createClient } from '@/supabase/server'
import type { Role, Status } from '@/types/database'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function signOut() {
  if (isAdminDemoMode()) {
    cookies().set(DEMO_COOKIE_NAME, '', {
      ...demoCookieOptions(process.env.VERCEL === '1'),
      maxAge: 0,
    })
    redirect('/login')
  }

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
  if (isAdminDemoMode()) {
    return { success: true as const }
  }

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
