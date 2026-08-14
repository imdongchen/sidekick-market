import { Link } from '@/components/link'
import { requireStaff } from '@/supabase/auth'
import { createClient } from '@/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin',
}

export default async function AdminHomePage() {
  const staff = await requireStaff()
  const supabase = createClient()

  const [{ count: memberCount }, { count: emailCount }] = await Promise.all([
    supabase.from('profile').select('id', { count: 'exact', head: true }),
    supabase
      .from('email_tracking')
      .select('id', { count: 'exact', head: true }),
  ])

  const tools = [
    {
      href: '/admin/members',
      title: 'Member management',
      description:
        'List members, view engagement (check-ins and weekly usage), and edit profile fields.',
      stat: `${memberCount ?? 0} members`,
    },
    {
      href: '/admin/emails',
      title: 'Email management',
      description:
        'Browse emails sent via Resend. Delivery events are stored in email_tracking from Resend webhooks.',
      stat: `${emailCount ?? 0} events`,
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
        Tools
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Signed in as {staff.firstName} ({staff.role}). Access is limited to your
        team by Supabase RLS.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <li key={tool.href}>
            <Link
              href={tool.href}
              className="block rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 transition hover:ring-zinc-300"
            >
              <h2 className="text-base font-semibold text-zinc-950">
                {tool.title}
              </h2>
              <p className="mt-2 text-sm text-zinc-600">{tool.description}</p>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-400">
                {tool.stat}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
