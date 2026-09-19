import { Button } from '@/components/button'
import { Heading, Subheading } from '@/components/text'
import {
  EXTERNAL,
  HEAD_COACH_EMAIL,
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
} from '@/components/teams/quicksilver-masters/ui'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Masters Swim Team',
  description:
    'Join the Quicksilver Masters swim team in San Jose — coach-led workouts, monthly membership, drop-ins, and free tryouts.',
}

export default function SwimTeamPage() {
  return (
    <>
      <PageHero
        eyebrow="Masters"
        title="QSS Masters Swim Team"
        lead="A friendly group of adults with a wide range of motivations — social swimming, national-level competition, triathlon prep, getting in shape, or proving you can learn something new at any age."
      />

      <ContentSection>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <Subheading>About our team</Subheading>
            <Heading as="h2" className="mt-2">
              Coach-led workouts for most experience levels
            </Heading>
            <Prose className="mt-6">
              <p>
                All swim team workouts are run by experienced coaches who offer
                instruction on the latest techniques and write workouts that
                accommodate most levels of swim experience.
              </p>
            </Prose>
          </div>
          <InfoCallout title="Fitness requirement">
            <p>
              Individuals who do not have the stamina to swim laps can pose a
              risk to themselves and fellow swimmers. Minimum requirement to
              join:
            </p>
            <BulletList items={fitnessRequirement} />
            <p className="mt-4">
              Swimmers at this level are considered beginners. Mid-morning and
              evening workouts are the most beginner-friendly. If you cannot do
              this comfortably yet, consider{' '}
              <a
                href={`${TEAM_BASE}/adult-learn-to-swim`}
                className="font-medium text-gray-950 underline decoration-gray-300 underline-offset-4"
              >
                Adult Learn-to-Swim
              </a>{' '}
              or private lessons.
            </p>
          </InfoCallout>
        </div>
      </ContentSection>

      <ContentSection>
        <Subheading>Pricing & registration</Subheading>
        <Heading as="h2" className="mt-2">
          Two steps to join
        </Heading>
        <Prose className="mt-6 max-w-3xl">
          <p>
            Please allow up to two business days for registrations to be
            processed (we are closed on Sundays). We activate your QSS account
            and send a welcome email once both registrations are complete.
          </p>
        </Prose>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <PriceCard
            label="Step 1 — QSS Masters monthly membership"
            price="$80 / mo"
            detail="$65 / mo for QSS parents. Any adult swimmer is welcome."
          />
          <PriceCard
            label="Step 2 — USMS membership"
            price="$75 / yr"
            detail="Required for insurance. Includes access to USMS-sanctioned events and members-only resources."
          />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button href={EXTERNAL.teamPortal}>QSS registration</Button>
          <Button href={EXTERNAL.usmsJoin} variant="secondary">
            USMS registration
          </Button>
        </div>
      </ContentSection>

      <ContentSection className="mb-8">
        <Subheading>Try before you join</Subheading>
        <Heading as="h2" className="mt-2">
          Drop-in or tryout
        </Heading>
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
            <h3 className="text-lg font-medium tracking-tight text-gray-950">
              Drop-in — $10
            </h3>
            <Prose className="mt-4">
              <p>
                Adult swimmers currently registered with USMS can drop in to any
                practice for a $10 fee. A great option for travelers visiting San
                Jose, athletes switching teams, or anyone returning to Masters.
              </p>
            </Prose>
            <div className="mt-6">
              <Button href={EXTERNAL.teamPortal} variant="outline">
                Book a drop-in practice
              </Button>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
            <h3 className="text-lg font-medium tracking-tight text-gray-950">
              Free tryouts — 2 practices
            </h3>
            <Prose className="mt-4">
              <p>
                Adults new to Masters swimming can try two free practices before
                joining. Check the{' '}
                <a
                  href={`${TEAM_BASE}/schedules`}
                  className="font-medium text-gray-950 underline decoration-gray-300 underline-offset-4"
                >
                  practice schedule
                </a>{' '}
                and email Coach Megan to arrange times. Some locations have gate
                codes or other restrictions we will share ahead of time.
              </p>
            </Prose>
            <div className="mt-6">
              <Button href={`mailto:${HEAD_COACH_EMAIL}`} variant="outline">
                Schedule a tryout
              </Button>
            </div>
          </div>
        </div>
      </ContentSection>
    </>
  )
}
