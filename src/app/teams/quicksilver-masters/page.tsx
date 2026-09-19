import { Button } from '@/components/button'
import { Link } from '@/components/link'
import { Heading, Subheading } from '@/components/text'
import {
  TEAM_BASE,
  TEAM_TAGLINE,
} from '@/components/teams/quicksilver-masters/constants'
import {
  BulletList,
  ContentSection,
  PageHero,
  Prose,
} from '@/components/teams/quicksilver-masters/ui'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    absolute: 'Quicksilver Masters',
  },
  description:
    'Quicksilver Masters — adult swim programs in San Jose for all abilities, from learn-to-swim to Masters and triathlon.',
}

const programs = [
  {
    href: `${TEAM_BASE}/swim-team`,
    eyebrow: 'Masters',
    title: 'Masters Swim Team',
    description:
      'For adults who can already swim and want to improve technique, fitness, or compete. Coach-led workouts for a wide range of abilities.',
    idealFor: [
      'Adults looking to improve technique',
      'Former competitive swimmers',
      'Fitness enthusiasts',
      'Open water event participants',
    ],
  },
  {
    href: `${TEAM_BASE}/triathlon`,
    eyebrow: 'Multi-sport',
    title: 'Triathlon Team',
    description:
      'Swim-focused triathlon training with guidance for the full race experience — the only year-round, coach-led triathlon program in San Jose.',
    idealFor: [
      'Beginning triathletes',
      'Experienced triathletes',
      'Athletes transitioning to triathlon',
      'Swimmers exploring multi-sport',
    ],
  },
  {
    href: `${TEAM_BASE}/adult-learn-to-swim`,
    eyebrow: 'Beginners',
    title: 'Adult Learn-to-Swim',
    description:
      'Small-group classes for adults with limited or no swimming experience, focused on water safety and foundational technique.',
    idealFor: [
      'Adults with fear of water',
      'Beginners learning proper techniques',
      'Adults improving basic skills',
      'Anyone building water confidence',
    ],
  },
] as const

export default function QuicksilverMastersHomePage() {
  return (
    <>
      <PageHero
        eyebrow={TEAM_TAGLINE}
        title="Adult swim programs for every goal."
        lead="Quicksilver Masters is a friendly group of adults (age 18+) with a wide range of motivations for coming to the pool — to be social, to compete, to get fit, to overcome fear, to release stress."
      >
        <Prose className="mt-8 max-w-3xl">
          <p>
            Our adult swim programs cater to all levels of ability and are run
            by experienced coaches who use the latest techniques. Whether you
            are returning to the water or training for your first race, there is
            a place for you on deck.
          </p>
        </Prose>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button href={`${TEAM_BASE}/schedules`}>View schedules</Button>
          <Button href={`${TEAM_BASE}/contact`} variant="secondary">
            Contact us
          </Button>
        </div>
      </PageHero>

      <ContentSection>
        <Subheading>Programs</Subheading>
        <Heading as="h2" className="mt-2">
          Ready to register?
        </Heading>
        <p className="mt-6 max-w-2xl text-sm/6 text-gray-600">
          Choose the program that best fits your swimming goals and experience
          level.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {programs.map((program) => (
            <article
              key={program.href}
              className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8"
            >
              <Subheading as="h3">{program.eyebrow}</Subheading>
              <h3 className="mt-3 text-2xl font-medium tracking-tight text-gray-950">
                <Link
                  href={program.href}
                  className="data-[hover]:text-gray-700"
                >
                  {program.title}
                </Link>
              </h3>
              <p className="mt-4 flex-1 text-sm/6 text-gray-600">
                {program.description}
              </p>
              <p className="mt-6 text-sm font-medium text-gray-950">
                Ideal for
              </p>
              <BulletList items={program.idealFor} />
              <div className="mt-8">
                <Button href={program.href} variant="outline">
                  Learn more
                </Button>
              </div>
            </article>
          ))}
        </div>
      </ContentSection>

      <ContentSection className="mb-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <Subheading>Next steps</Subheading>
            <Heading as="h2" className="mt-2">
              How to get started
            </Heading>
            <Prose className="mt-6">
              <p>
                Not sure which lane you belong in? Email Coach Megan with your
                swim background and goals — she will point you to the right
                program, tryout, or private lesson.
              </p>
            </Prose>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href={`${TEAM_BASE}/faq`}>Read the FAQ</Button>
              <Button href={`${TEAM_BASE}/coaches`} variant="secondary">
                Meet the coaches
              </Button>
            </div>
          </div>
          <div className="rounded-2xl bg-gray-950 p-8 text-white sm:p-10">
            <Subheading dark>Practice</Subheading>
            <p className="mt-3 text-2xl font-medium tracking-tight">
              Multiple San Jose pools, morning to evening.
            </p>
            <p className="mt-4 text-sm/6 text-white/70">
              Almaden Swim & Racquet Club, Gunderson High School, and Pinehurst
              Cabana Club — see the full weekly grid on the schedules page.
            </p>
            <div className="mt-8">
              <Button
                href={`${TEAM_BASE}/schedules`}
                variant="secondary"
                className="bg-white text-gray-950"
              >
                See practice times
              </Button>
            </div>
          </div>
        </div>
      </ContentSection>
    </>
  )
}
