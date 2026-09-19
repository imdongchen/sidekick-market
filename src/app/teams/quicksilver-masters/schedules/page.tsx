import { Heading, Subheading } from '@/components/text'
import {
  ContentSection,
  InfoCallout,
  PageHero,
  ScheduleBlock,
} from '@/components/teams/quicksilver-masters/ui'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Schedules',
  description:
    'Quicksilver Masters practice schedules for Almaden, Gunderson, and Pinehurst — plus ALTS and Intro times.',
}

export default function SchedulesPage() {
  return (
    <>
      <PageHero
        eyebrow="When & where"
        title="Program schedules"
        lead="Weekly practice grids for Masters, Adult Learn-to-Swim, Intro to Masters, and private lessons across our San Jose pools."
      />

      <ContentSection>
        <InfoCallout title="Masters practice changes & events">
          <p className="font-medium text-gray-950">
            Gunderson High School main pool notice
          </p>
          <p className="mt-2">
            The main pool at Gunderson High School was temporarily closed as of
            3:00 PM on Tuesday 9/8. The Thursday 9/10 7:30 PM practice was
            cancelled. The Friday 9/11 5:45 AM practice moved to the diving
            well. The school district is working to resolve the issue — we will
            advise the team when we have further information.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            <li>
              Wednesday, September 9 — 12:00 PM practice begins at Pinehurst
            </li>
            <li>
              Saturday, September 12 — Annual Season Kickoff Dinner & Awards
              (see email to RSVP)
            </li>
          </ul>
          <p className="mt-4 text-xs uppercase tracking-wider text-gray-500">
            Last updated 9/10
          </p>
        </InfoCallout>
      </ContentSection>

      <ContentSection>
        <Subheading>Masters</Subheading>
        <Heading as="h2" className="mt-2">
          Masters practice schedule
        </Heading>
        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-3">
          <ScheduleBlock
            title="Almaden Swim & Racquet Club (ASRC)"
            rows={[
              { time: '6:00–7:15 AM', days: 'Mon / Tue / Wed / Thu / Fri' },
              { time: '7:15–8:30 AM', days: 'Tue / Thu' },
              { time: '9:00–10:15 AM', days: 'Mon / Wed / Fri' },
              { time: '7:30–9:00 AM', days: 'Sat' },
            ]}
          />
          <ScheduleBlock
            title="Gunderson High School (GHS)"
            rows={[
              { time: '5:45–7:00 AM', days: 'Mon / Wed / Fri' },
              { time: '7:30–8:45 PM', days: 'Mon / Tue / Wed / Thu' },
            ]}
          />
          <ScheduleBlock
            title="Pinehurst Cabana Club (PH)"
            note="Midday practice beginning September 9, 2026."
            rows={[{ time: '12:00–1:15 PM', days: 'Mon / Wed / Fri' }]}
          />
        </div>
      </ContentSection>

      <ContentSection>
        <Subheading>Learn to swim</Subheading>
        <Heading as="h2" className="mt-2">
          Adult Learn-to-Swim
        </Heading>
        <p className="mt-4 max-w-2xl text-sm/6 text-gray-600">
          Summer-only program. Classes typically run from May through July.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-2">
          <ScheduleBlock
            title="Almaden Swim & Racquet Club (ASRC)"
            rows={[{ time: '7:15–8:00 AM', days: 'Mon / Wed' }]}
          />
          <ScheduleBlock
            title="Gunderson High School (GHS)"
            rows={[{ time: '7:30–8:15 PM', days: 'Mon / Wed' }]}
          />
        </div>
      </ContentSection>

      <ContentSection className="mb-8">
        <Subheading>By request</Subheading>
        <Heading as="h2" className="mt-2">
          Intro to Masters & private lessons
        </Heading>
        <p className="mt-4 max-w-2xl text-sm/6 text-gray-600">
          Intro to Masters and private lessons are by request only. Times below
          reflect typical coach availability and may change.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-2">
          <ScheduleBlock
            title="Almaden Swim & Racquet Club (ASRC)"
            rows={[{ time: '7:15–8:15 AM', days: 'Tue / Thu' }]}
          />
          <ScheduleBlock
            title="Gunderson High School (GHS)"
            rows={[
              { time: '7:30–8:30 PM', days: 'Tue / Thu' },
              { time: '10:30 AM–12:30 PM', days: 'Sat' },
            ]}
          />
        </div>
      </ContentSection>
    </>
  )
}
