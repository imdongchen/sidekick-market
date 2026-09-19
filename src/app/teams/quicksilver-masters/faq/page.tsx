import { Link } from '@/components/link'
import { Heading, Subheading } from '@/components/text'
import {
  EXTERNAL,
  HEAD_COACH_EMAIL,
  HEAD_COACH_NAME,
  TEAM_BASE,
  fitnessRequirement,
  locations,
} from '@/components/teams/quicksilver-masters/constants'
import {
  BulletList,
  ContentSection,
  PageHero,
  Prose,
} from '@/components/teams/quicksilver-masters/ui'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about Quicksilver Masters programs, tryouts, membership, and cancellation policy.',
}

const faqs = [
  {
    question: 'Which adult swim program is right for me?',
    answer: (
      <>
        <p>
          For safety — and so every swimmer gets the attention they need — we
          have a fitness requirement for the adult swim team:
        </p>
        <BulletList items={fitnessRequirement} />
        <p className="mt-4">
          Not sure what we mean by side breathing or flutter kicking? Watch a
          short example of{' '}
          <Link
            href={EXTERNAL.sideBreathingExample}
            className="font-medium text-gray-950 underline decoration-gray-300 underline-offset-4"
          >
            freestyle side breathing
          </Link>{' '}
          or{' '}
          <Link
            href={EXTERNAL.flutterKickExample}
            className="font-medium text-gray-950 underline decoration-gray-300 underline-offset-4"
          >
            flutter kick
          </Link>
          , then email Coach Megan if you still have questions.
        </p>
      </>
    ),
  },
  {
    question: 'How do I join?',
    answer: (
      <>
        <p>
          Email Head Coach {HEAD_COACH_NAME} (she/her) at{' '}
          <a
            href={`mailto:${HEAD_COACH_EMAIL}`}
            className="font-medium text-gray-950 underline decoration-gray-300 underline-offset-4"
          >
            {HEAD_COACH_EMAIL}
          </a>
          . Include your name, swim background or skill level, and which program
          you are interested in. She will reply with registration instructions.
        </p>
        <p className="mt-4">
          All QSS Masters members must register with United States Masters
          Swimming (USMS). While you wait to hear back, join or renew USMS —
          LMSC: Pacific, Club: Quicksilver.
        </p>
        <p className="mt-4">
          <Link
            href={EXTERNAL.usmsJoin}
            className="font-medium text-gray-950 underline decoration-gray-300 underline-offset-4"
          >
            Join USMS
          </Link>
          {' · '}
          <Link
            href={`${TEAM_BASE}/swim-team`}
            className="font-medium text-gray-950 underline decoration-gray-300 underline-offset-4"
          >
            Masters registration details
          </Link>
        </p>
      </>
    ),
  },
  {
    question: 'Can I try it out first?',
    answer: (
      <>
        <p>
          For swim team, you get a free trial of two workouts. Tell Coach Megan
          which practice(s) you want to attend. Some facilities have gate codes
          or other restrictions.
        </p>
        <p className="mt-4">
          There is no trial period for Adult Learn-to-Swim classes or private
          lessons.
        </p>
      </>
    ),
  },
  {
    question: 'What is the cancellation policy?',
    answer: (
      <>
        <p>
          For swim team participants, billing is automatically processed on the
          1st of each month. To cancel or place your account on hold, email
          Coach Megan at{' '}
          <a
            href={`mailto:${HEAD_COACH_EMAIL}`}
            className="font-medium text-gray-950 underline decoration-gray-300 underline-offset-4"
          >
            {HEAD_COACH_EMAIL}
          </a>{' '}
          at least 5 days prior to the 1st of the month.
        </p>
        <p className="mt-4">
          For learn-to-swim participants, billing occurs at registration. We do
          not issue refunds or allow make-up classes, except when a class is
          cancelled (for example, unexpected pool closure or instructor illness).
        </p>
      </>
    ),
  },
] as const

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="Help"
        title="FAQ"
        lead="Program fit, how to join, tryouts, and cancellation — plus pool addresses across San Jose."
      />

      <ContentSection>
        <Subheading>Locations</Subheading>
        <Heading as="h2" className="mt-2">
          Where we practice
        </Heading>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {locations.map((location) => (
            <div
              key={location.name}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                {location.short}
              </p>
              <h3 className="mt-3 text-lg font-medium tracking-tight text-gray-950">
                {location.name}
              </h3>
              <p className="mt-3 text-sm/6 text-gray-600">
                {location.address}
                <br />
                {location.city}
              </p>
            </div>
          ))}
        </div>
      </ContentSection>

      <ContentSection className="mb-8">
        <Subheading>Questions</Subheading>
        <Heading as="h2" className="mt-2">
          Frequently asked questions
        </Heading>
        <div className="mx-auto mt-12 max-w-2xl space-y-12">
          {faqs.map((faq) => (
            <dl key={faq.question}>
              <dt className="text-sm font-semibold text-gray-950">
                {faq.question}
              </dt>
              <dd className="mt-4 text-sm/6 text-gray-600">
                <Prose>{faq.answer}</Prose>
              </dd>
            </dl>
          ))}
        </div>
      </ContentSection>
    </>
  )
}
