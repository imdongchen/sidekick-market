import { Button } from '@/components/button'
import { Heading, Subheading } from '@/components/text'
import {
  EXTERNAL,
  TEAM_BASE,
  fitnessRequirement,
} from '@/components/teams/quicksilver-masters/constants'
import {
  BulletList,
  ContentSection,
  InfoCallout,
  PageHero,
  PriceCard,
  Prose,
  ScheduleBlock,
} from '@/components/teams/quicksilver-masters/ui'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Triathlon',
  description:
    'Quicksilver Triathlon — year-round, coach-led triathlon training in San Jose with a focus on swimming.',
}

const includes = [
  'Four in-person sessions with the triathlon team led by a certified Tri Coach',
  'Full access to Quicksilver Masters swim practices',
  'An individual workout plan at the beginning of each week',
  'Discounts on select training & competition gear, apparel, and race entry fees',
] as const

export default function TriathlonPage() {
  return (
    <>
      <PageHero
        eyebrow="Triathlon"
        title="Quicksilver Triathlon"
        lead="We established the program to bring triathlon to first-time and amateur athletes in the South Bay, with a primary focus on swimming — often the biggest barrier to entry."
      />

      <ContentSection>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <Subheading>Who</Subheading>
            <Heading as="h2" className="mt-2">
              Built for beginners and amateurs
            </Heading>
            <Prose className="mt-6">
              <p>Our program responds to two gaps in the local triathlon scene:</p>
            </Prose>
            <BulletList
              items={[
                'We are the only year-round, in-person, coach-led triathlon program in San Jose.',
                'We create pathways for beginners while still serving seasoned competitors.',
              ]}
            />
          </div>
          <div>
            <Subheading>What</Subheading>
            <Heading as="h2" className="mt-2">
              What membership includes
            </Heading>
            <Prose className="mt-6">
              <p>
                Comprehensive, coach-led preparation that is accessible and
                adaptable. Training typically begins in April, with team
                competition in local events from May through September, building
                toward a final triathlon in October.
              </p>
            </Prose>
            <BulletList items={includes} />
          </div>
        </div>
      </ContentSection>

      <ContentSection>
        <Subheading>Where / when</Subheading>
        <Heading as="h2" className="mt-2">
          Weekly training & race season
        </Heading>
        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-2">
          <ScheduleBlock
            title="In-person, coach-led sessions"
            rows={[
              { time: 'Tuesdays', days: 'Running 6:30–7:30 PM' },
              { time: 'Wednesdays', days: 'Swimming 7:30–8:45 PM' },
              { time: 'Thursdays', days: 'Biking 7:00–8:30 PM' },
              { time: 'Weekend', days: 'Transitions TBA' },
            ]}
          />
          <div>
            <h3 className="text-lg font-medium tracking-tight text-gray-950">
              Competition schedule
            </h3>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {['May', 'July', 'Sept', 'Oct'].map((month) => (
                <li
                  key={month}
                  className="rounded-xl bg-white px-4 py-5 text-center text-sm font-medium text-gray-950 shadow-sm ring-1 ring-black/5"
                >
                  {month}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm/6 text-gray-500">
              Exact races are shared with the team each season.
            </p>
          </div>
        </div>
      </ContentSection>

      <ContentSection>
        <Subheading>Pricing</Subheading>
        <Heading as="h2" className="mt-2">
          How much?
        </Heading>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <PriceCard
            label="Monthly membership"
            price="$120 / mo"
            detail="Includes swim access plus weekly run, bike, and transition sessions."
          />
          <InfoCallout title="Additional cost services">
            <p>
              Open water swims in Santa Cruz or the Bay, stroke clinics with
              video analysis, and personalized advice based on performance.
            </p>
          </InfoCallout>
        </div>
        <div className="mt-8">
          <Button href={EXTERNAL.teamPortal}>Register now</Button>
        </div>
      </ContentSection>

      <ContentSection className="mb-8">
        <InfoCallout title="Fitness requirement">
          <p>
            For safety, triathlon members must meet the same minimum swim
            standard as the Masters team:
          </p>
          <BulletList items={fitnessRequirement} />
          <p className="mt-4">
            If you cannot yet meet the requirement, start with{' '}
            <a
              href={`${TEAM_BASE}/adult-learn-to-swim`}
              className="font-medium text-gray-950 underline decoration-gray-300 underline-offset-4"
            >
              Adult Learn-to-Swim
            </a>{' '}
            or Intro to Masters before joining triathlon.
          </p>
        </InfoCallout>
      </ContentSection>
    </>
  )
}
