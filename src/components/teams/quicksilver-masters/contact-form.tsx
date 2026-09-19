'use client'

import { Button } from '@/components/button'
import { useState } from 'react'
import { HEAD_COACH_EMAIL } from './constants'

export function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [comments, setComments] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const subject = encodeURIComponent(`Quicksilver Masters inquiry from ${name}`)
    const body = encodeURIComponent(
      [
        `Name: ${name}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : null,
        '',
        comments,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    window.location.href = `mailto:${HEAD_COACH_EMAIL}?subject=${subject}&body=${body}`
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label="Full name" htmlFor="name">
        <input
          id="name"
          name="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClassName}
          autoComplete="name"
        />
      </Field>
      <Field label="Email address" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClassName}
          autoComplete="email"
        />
      </Field>
      <Field label="Phone number" htmlFor="phone">
        <input
          id="phone"
          name="phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={inputClassName}
          autoComplete="tel"
        />
      </Field>
      <Field label="Comments" htmlFor="comments">
        <textarea
          id="comments"
          name="comments"
          required
          rows={5}
          value={comments}
          onChange={(event) => setComments(event.target.value)}
          className={inputClassName}
        />
      </Field>
      <Button type="submit" className="w-full sm:w-auto">
        Send message
      </Button>
      <p className="text-sm/6 text-gray-500">
        Opens your email app addressed to {HEAD_COACH_EMAIL}. You can also use
        the team portal contact form if you prefer.
      </p>
    </form>
  )
}

const inputClassName =
  'mt-2 block w-full rounded-lg border border-transparent bg-white px-3.5 py-2.5 text-sm/6 text-gray-950 shadow ring-1 ring-black/10 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-gray-950'

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium text-gray-950">
        {label}
      </label>
      {children}
    </div>
  )
}
