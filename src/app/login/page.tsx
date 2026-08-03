import { GradientBackground } from '@/components/gradient'
import { LoginForm } from '@/components/admin/login-form'
import { getStaffProfile } from '@/supabase/auth'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Admin Login',
  description: 'Sign in to Sidekick admin tools.',
}

export default async function LoginPage() {
  const staff = await getStaffProfile()
  if (staff) redirect('/admin')

  return (
    <main className="overflow-hidden bg-gray-50">
      <GradientBackground />
      <div className="isolate flex min-h-dvh items-center justify-center p-6 lg:p-8">
        <Suspense fallback={<div className="h-80 w-full max-w-md animate-pulse rounded-xl bg-white" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
