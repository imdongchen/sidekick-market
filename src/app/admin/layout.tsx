import { signOut } from '@/app/admin/actions'
import { Link } from '@/components/link'
import { isAdminDemoMode } from '@/lib/admin-demo-server'
import { requireStaff } from '@/supabase/auth'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

const nav = [
  { href: '/admin', label: 'Overview', exact: true },
  { href: '/admin/members', label: 'Members' },
  { href: '/admin/emails', label: 'Emails' },
]

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const staff = await requireStaff()
  const demo = isAdminDemoMode()

  return (
    <div className="min-h-dvh bg-zinc-50">
      {demo && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-950">
          Preview demo mode — fixture data only. Member edits and email sends
          are no-ops.
        </div>
      )}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link
              href="/admin"
              className="text-lg font-semibold tracking-tight"
            >
              Sidekick Admin
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-zinc-500 sm:inline">
              {staff.firstName} {staff.lastName}
              <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium uppercase text-zinc-600">
                {staff.role}
              </span>
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-zinc-100 px-4 py-2 sm:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
