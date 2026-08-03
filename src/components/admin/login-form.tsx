'use client'

import { Button } from '@/components/button'
import { Link } from '@/components/link'
import { Mark } from '@/components/logo'
import { createClient } from '@/supabase/browser'
import { Field, Input, Label } from '@headlessui/react'
import { clsx } from 'clsx'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'

const inputClass = clsx(
  'block w-full rounded-lg border border-transparent shadow ring-1 ring-black/10',
  'px-[calc(theme(spacing.2)-1px)] py-[calc(theme(spacing[1.5])-1px)] text-base/6 sm:text-sm/6',
  'data-[focus]:outline data-[focus]:outline-2 data-[focus]:-outline-offset-1 data-[focus]:outline-black',
)

function isPasswordLogin(email: string) {
  return (
    email.endsWith('@sidekick.com') || email.endsWith('@sidekickswim.com')
  )
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/admin'
  const urlError = searchParams.get('error')

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(
    urlError === 'unauthorized'
      ? 'Only coaches and admins can access the admin tools.'
      : '',
  )
  const [loading, setLoading] = useState(false)

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const trimmed = email.trim().toLowerCase()

    if (isPasswordLogin(trimmed)) {
      setEmail(trimmed)
      setStep('code')
      setLoading(false)
      return
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: false },
    })
    setLoading(false)

    if (otpError) {
      setError(otpError.message)
      return
    }

    setEmail(trimmed)
    setStep('code')
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()

    if (isPasswordLogin(email)) {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: code,
      })
      if (authError) {
        setLoading(false)
        setError(authError.message)
        return
      }
    } else {
      const { error: authError } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'email',
      })
      if (authError) {
        setLoading(false)
        setError(authError.message)
        return
      }
    }

    // Confirm staff role before entering admin
    const res = await fetch('/api/admin/session')
    const data = await res.json()
    setLoading(false)

    if (!data.ok) {
      await supabase.auth.signOut()
      setError(data.error || 'Only coaches and admins can sign in.')
      setStep('email')
      setCode('')
      return
    }

    router.replace(next.startsWith('/') ? next : '/admin')
    router.refresh()
  }

  return (
    <div className="w-full max-w-md rounded-xl bg-white shadow-md ring-1 ring-black/5">
      {step === 'email' ? (
        <form onSubmit={sendCode} className="p-7 sm:p-11">
          <div className="flex items-start">
            <Link href="/" title="Home">
              <Mark className="h-9 fill-black" />
            </Link>
          </div>
          <h1 className="mt-8 text-base/6 font-medium">Admin sign in</h1>
          <p className="mt-1 text-sm/5 text-gray-600">
            Coaches and admins only. We&apos;ll email you a one-time code.
          </p>
          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <Field className="mt-8 space-y-3">
            <Label className="text-sm/5 font-medium">Email</Label>
            <Input
              required
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="mt-8">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending…' : 'Continue'}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="p-7 sm:p-11">
          <div className="flex items-start">
            <Link href="/" title="Home">
              <Mark className="h-9 fill-black" />
            </Link>
          </div>
          <h1 className="mt-8 text-base/6 font-medium">
            {isPasswordLogin(email) ? 'Enter password' : 'Enter code'}
          </h1>
          <p className="mt-1 text-sm/5 text-gray-600">
            {isPasswordLogin(email)
              ? `Signing in as ${email}`
              : `We sent a 6-digit code to ${email}`}
          </p>
          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <Field className="mt-8 space-y-3">
            <Label className="text-sm/5 font-medium">
              {isPasswordLogin(email) ? 'Password' : 'Code'}
            </Label>
            <Input
              required
              autoFocus
              type={isPasswordLogin(email) ? 'password' : 'text'}
              inputMode={isPasswordLogin(email) ? undefined : 'numeric'}
              autoComplete={
                isPasswordLogin(email) ? 'current-password' : 'one-time-code'
              }
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="mt-8 flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
            <button
              type="button"
              className="text-sm font-medium text-gray-600 hover:text-gray-950"
              onClick={() => {
                setStep('email')
                setCode('')
                setError('')
              }}
            >
              Use a different email
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
