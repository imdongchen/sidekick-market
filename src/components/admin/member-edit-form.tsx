'use client'

import { updateMember } from '@/app/admin/actions'
import { Link } from '@/components/link'
import type { Profile, Role, Status } from '@/types/database'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

const fieldClass =
  'mt-1 block w-full rounded-lg border-0 px-3 py-2 text-sm shadow-sm ring-1 ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-950'

export function MemberEditForm({ member }: { member: Profile }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const roleValue = String(form.get('role') || '')
    const result = await updateMember({
      id: member.id,
      firstName: String(form.get('firstName') || ''),
      lastName: String(form.get('lastName') || ''),
      email: String(form.get('email') || ''),
      birthday: String(form.get('birthday') || '') || null,
      usmsId: String(form.get('usmsId') || '') || null,
      role: (roleValue || null) as Role | null,
      status: String(form.get('status')) as Status,
      slug: String(form.get('slug') || ''),
    })

    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess(true)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 max-w-xl space-y-5">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Saved.
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-700">
          First name
          <input
            name="firstName"
            required
            defaultValue={member.firstName}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Last name
          <input
            name="lastName"
            required
            defaultValue={member.lastName}
            className={fieldClass}
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-zinc-700">
        Email
        <input
          name="email"
          type="email"
          required
          defaultValue={member.email}
          className={fieldClass}
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-700">
          Birthday
          <input
            name="birthday"
            type="date"
            defaultValue={member.birthday ?? ''}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          USMS ID
          <input
            name="usmsId"
            defaultValue={member.usmsId ?? ''}
            className={fieldClass}
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-zinc-700">
        Slug
        <input
          name="slug"
          required
          defaultValue={member.slug}
          className={fieldClass}
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-700">
          Role
          <select
            name="role"
            defaultValue={member.role ?? ''}
            className={fieldClass}
          >
            <option value="">—</option>
            <option value="swimmer">Swimmer</option>
            <option value="coach">Coach</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Status
          <select
            name="status"
            defaultValue={member.status}
            className={fieldClass}
          >
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="invited">Invited</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save changes'}
        </button>
        <Link
          href="/admin/members"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-950"
        >
          Back to list
        </Link>
      </div>
    </form>
  )
}
