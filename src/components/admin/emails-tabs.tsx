import { Link } from '@/components/link'

type Tab = 'campaign' | 'draft'

export function EmailsTabs({ active }: { active: Tab }) {
  const tabs: { id: Tab; label: string; href: string }[] = [
    {
      id: 'campaign',
      label: 'Re-introduce campaign',
      href: '/admin/emails',
    },
    {
      id: 'draft',
      label: 'Draft new email',
      href: '/admin/emails?tab=draft',
    },
  ]

  return (
    <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-px">
      {tabs.map((tab) => {
        const selected = tab.id === active
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`-mb-px rounded-t-lg px-3 py-2 text-sm font-medium transition ${
              selected
                ? 'border-b-2 border-zinc-950 text-zinc-950'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
