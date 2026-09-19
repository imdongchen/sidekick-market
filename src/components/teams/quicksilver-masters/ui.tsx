import { clsx } from 'clsx'
import { Container } from '@/components/container'
import { Heading, Lead, Subheading } from '@/components/text'

export function PageHero({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string
  title: string
  lead?: string
  children?: React.ReactNode
}) {
  return (
    <Container className="mt-16">
      {eyebrow ? <Subheading>{eyebrow}</Subheading> : null}
      <Heading as="h1" className={eyebrow ? 'mt-2' : undefined}>
        {title}
      </Heading>
      {lead ? <Lead className="mt-6 max-w-3xl">{lead}</Lead> : null}
      {children}
    </Container>
  )
}

export function ContentSection({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <Container className={clsx('mt-24', className)}>{children}</Container>
}

export function Prose({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={clsx('space-y-6 text-sm/6 text-gray-600', className)}>
      {children}
    </div>
  )
}

export function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm/6 text-gray-600">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export function InfoCallout({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl bg-gray-950/[0.03] p-6 ring-1 ring-black/5 sm:p-8">
      <h3 className="text-base font-medium tracking-tight text-gray-950">
        {title}
      </h3>
      <div className="mt-3 text-sm/6 text-gray-600">{children}</div>
    </div>
  )
}

export function PriceCard({
  label,
  price,
  detail,
}: {
  label: string
  price: string
  detail?: string
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-3 text-3xl font-medium tracking-tight text-gray-950">
        {price}
      </p>
      {detail ? <p className="mt-2 text-sm/6 text-gray-600">{detail}</p> : null}
    </div>
  )
}

export function ScheduleBlock({
  title,
  note,
  rows,
}: {
  title: string
  note?: string
  rows: { time: string; days: string }[]
}) {
  return (
    <div>
      <h3 className="text-lg font-medium tracking-tight text-gray-950">
        {title}
      </h3>
      {note ? <p className="mt-2 text-sm/6 text-gray-500">{note}</p> : null}
      <dl className="mt-4 divide-y divide-gray-200 border-t border-gray-200">
        {rows.map((row) => (
          <div
            key={`${row.time}-${row.days}`}
            className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-2 sm:gap-4"
          >
            <dt className="text-sm font-medium text-gray-950">{row.time}</dt>
            <dd className="text-sm text-gray-600">{row.days}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
