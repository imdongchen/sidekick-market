import { createClient } from '@/supabase/server'
import { getSessionUser, isStaffRole } from '@/supabase/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 })
  }

  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profile')
    .select('role, firstName, lastName')
    .eq('userId', user.id)
    .maybeSingle()

  if (!profile || !isStaffRole(profile.role)) {
    return NextResponse.json(
      { ok: false, error: 'Only coaches and admins can access admin tools.' },
      { status: 403 },
    )
  }

  return NextResponse.json({
    ok: true,
    role: profile.role,
    name: `${profile.firstName} ${profile.lastName}`,
  })
}
