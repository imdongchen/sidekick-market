import { Button } from '@/components/button'
import { Heading, Subheading } from '@/components/text'
import {
  EXTERNAL,
  HEAD_COACH_EMAIL,
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
  title: 'Adult Learn to Swim',
  description:
    'Quicksilver Masters Adult Learn-to-Swim — small group ALTS classes and Intro to Masters in San Jose.',
}

export default function AdultLearnToSwimPage() {
  return (
    <>
      <PageHero
        eyebrow="Beginners"
        title="Adult Learn to Swim"
        lead="Small-group classes for adults who are comfortable getting in the water and submerging — focused on water safety and foundational stroke skills."
      />

      <ContentSection>
        <Subheading>What is ALTS?</Subheading>
        <Heading as="h2" className="mt-2">
          Adult Learn-to-Swim
        </Heading>
        <Prose className="mt-6 max-w-3xl">
          <p>
            Our ALTS program is a series of small group classes (3 students
            max). We teach water safety skills like floating, air exchange,
            treading water, kicking, and basic freestyle and backstroke.
            Classes are led by instructors certified through the United States
            Masters Swimming ALTS Program and assisted by experienced Masters
            teammates.
          </p>
          <p>
            Each class meets three times per week on Mondays, Wednesdays, and
            Fridays, and runs for four weeks at a time.
          </p>
        </Prose>

        <InfoCallout title="Private lessons instead of ALTS">
          <p>
            Adults overcoming fear of the water, or who already swim freestyle
            with side breathing, should pursue private lessons instead of ALTS.
            Email Head Coach Megan at{' '}
            <a
              href={`mailto:${HEAD_COACH_EMAIL}`}
              className="font-medium text-gray-950 underline decoration-gray-300 underline-offset-4"
            >
              {HEAD_COACH_EMAIL}
            </a>{' '}
            to get matched with a private instructor.
          </p>
        </InfoCallout>
      </ContentSection>

      <ContentSection>
        <Subheading>2026 Summer sessions</Subheading>
        <Heading as="h2" className="mt-2">
          Class schedule & pricing
        </Heading>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
            <p className="text-sm font-medium text-gray-500">Session 1</p>
            <p className="mt-2 text-xl font-medium tracking-tight text-gray-950">
              June 1 – June 26
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
            <p className="text-sm font-medium text-gray-500">Session 2</p>
            <p className="mt-2 text-xl font-medium tracking-tight text-gray-950">
              June 29 – July 24
            </p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2">
          <ScheduleBlock
            title="Almaden Swim & Racquet Club"
            rows={[
              {
                time: '7:15–8:00 AM',
                days: 'Mon / Wed / Fri',
              },
              {
                time: '8:15–9:00 AM',
                days: 'Mon / Wed / Fri (by request only)',
              },
            ]}
          />
          <ScheduleBlock
            title="Gunderson High School"
            rows={[
              {
                time: '7:45–8:30 PM',
                days: 'Mon / Wed / Fri',
              },
            ]}
          />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <PriceCard
            label="Class tuition"
            price="$480"
            detail="Per four-week session. Scholarships available upon request."
          />
          <PriceCard
            label="QSS discount"
            price="10% off"
            detail="For parents of active QSS athletes and spouses of active Masters members."
          />
        </div>

        <InfoCallout title="Registration status">
          <p className="font-medium text-gray-950">
            ALTS classes are on hold for the school year. Check back in April
            2027.
          </p>
          <p className="mt-3">
            When registration opens, complete QSS ALTS class registration and a
            current USMS membership. Our admin team approves class registration
            one week before the start date and sends a welcome email with first-week
            homework.
          </p>
        </InfoCallout>
      </ContentSection>

      <ContentSection>
        <Subheading>USMS membership</Subheading>
        <Heading as="h2" className="mt-2">
          Insurance for every adult program
        </Heading>
        <Prose className="mt-6 max-w-3xl">
          <p>
            USMS provides insurance coverage for all of Quicksilver&apos;s adult
            swim programs. All coaches, instructors, members, and students must
            be current USMS members. Choose Quicksilver Masters as your club
            team. LMSC = Pacific.
          </p>
        </Prose>
        <BulletList
          items={[
            'Trial membership (free) — expires after 30 days; once per lifetime. Complete the form the day before your first class.',
            'Standard membership ($75) — valid through December 31, 2026, and carries over when you graduate into Masters.',
          ]}
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href={EXTERNAL.usmsJoin}>Join USMS</Button>
          <Button href={EXTERNAL.teamPortal} variant="secondary">
            QSS portal
          </Button>
        </div>
      </ContentSection>

      <ContentSection className="mb-8">
        <Subheading>Next level</Subheading>
        <Heading as="h2" className="mt-2">
          Introduction to Masters
        </Heading>
        <Prose className="mt-6 max-w-3xl">
          <p>
            Best suited for ALTS graduates and adults who swim freestyle with
            side breathing but do not yet have the stamina for multiple lengths
            non-stop. Builds aerobic endurance, introduces backstroke and
            breaststroke basics, swim jargon, and how to use the pace clock.
          </p>
        </Prose>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <PriceCard
            label="Non-QSS students"
            price="$50 / week"
            detail="By request — needs at least 3 interested swimmers."
          />
          <PriceCard
            label="QSS parents"
            price="$45 / week"
            detail="Locations: Gunderson, Almaden, or Pinehurst."
          />
        </div>
        <p className="mt-8 text-sm/6 text-gray-600">
          Questions? Contact Head Coach Megan Waters at{' '}
          <a
            href={`mailto:${HEAD_COACH_EMAIL}`}
            className="font-medium text-gray-950 underline decoration-gray-300 underline-offset-4"
          >
            {HEAD_COACH_EMAIL}
          </a>
          .
        </p>
      </ContentSection>
    </>
  )
}
