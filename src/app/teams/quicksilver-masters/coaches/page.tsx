import { Heading, Subheading } from '@/components/text'
import { HEAD_COACH_EMAIL } from '@/components/teams/quicksilver-masters/constants'
import {
  ContentSection,
  PageHero,
  Prose,
} from '@/components/teams/quicksilver-masters/ui'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Coaches',
  description:
    'Meet the Quicksilver Masters coaching staff — Megan Waters, Eric Wong, Ricki Cruz, and Anne Vargas.',
}

const coaches = [
  {
    name: 'Megan Waters',
    roles: 'Masters Head Coach, Meet Director, ALTS Manager',
    email: HEAD_COACH_EMAIL,
    sections: [
      {
        title: 'Athlete',
        body: 'Megan began swimming at her hometown pool in Maryland, competing in summer league before joining a year-round team at age 10. She reached Junior Nationals, Nationals, and US Open in high school in backstroke and freestyle sprint events. At Princeton University she competed at NCAA in 2011 and Olympic Trials in 2012 in the 50 and 100 freestyle.',
      },
      {
        title: 'Coach',
        body: 'Megan coached in high school and college, studied technique at University of Michigan and West Point camps, assisted at Denison University, and coached at the UT swim camp in Austin. After moving to the Bay Area she joined San Mateo Masters part-time as a technique specialist, then became full-time Head Coach for Quicksilver Masters. She also directs Quicksilver age group and Masters meets and runs the summer Adult Learn-to-Swim program. She is a NASM certified personal trainer.',
      },
      {
        title: 'Human',
        body: 'Outside the pool, Megan enjoys cycling, reading, eating, and crafting. She dabbles in dancing.',
      },
    ],
    philosophy:
      "I have two philosophies that guide the way I coach Masters: 'work with what you got' and 'fun in the water = feel in the water.' My approach is to guide adults to swim in a way that minimizes risk of injury, by emphasizing technique that works within their range of motion, and I encourage them to explore how their body moves in the water — every body is unique.",
  },
  {
    name: 'Eric Wong',
    roles: 'Masters Coach, ALTS Instructor',
    email: 'eric@swimqss.org',
    sections: [
      {
        title: 'Background',
        body: 'Before joining Quicksilver Masters in San Jose, Eric coached Quicksilver Masters in Santa Cruz and spent several years with club and youth rec teams in the East Bay. He swam competitively from age six, specialized in sprint butterfly at UC Santa Cruz, and now races Masters breaststroke — setting best times in his mid-40s.',
      },
      {
        title: 'Approach',
        body: 'Eric takes a hands-on approach to training and continues to compete himself. When he is not coaching or racing, he hikes rugged trails and camps under the stars.',
      },
    ],
    philosophy:
      'I believe there is both an art and a science to swimming fast. By introducing new technical skills and perspectives I can empower and encourage swimmers to improve, regardless of their current age or ability.',
  },
  {
    name: 'Ricki Cruz',
    roles: 'Masters & Age Group Coach, ALTS Instructor',
    email: 'ricki@swimqss.org',
    sections: [
      {
        title: 'Background',
        body: 'Before becoming a coach, Ricki was — and still is — a Quicksilver Masters swimmer. She felt welcomed from day one and wanted to give back to the community that felt like family. That led her to join the coaching staff.',
      },
    ],
    philosophy:
      'I am dedicated to providing a safe space for swimmers of all ages to explore and become themselves, and hope to inspire adults to join the sport or get back in the pool.',
  },
  {
    name: 'Anne Vargas',
    roles: 'Masters & Age Group Coach, ALTS Instructor',
    email: 'vargaspace@gmail.com',
    sections: [
      {
        title: 'Background',
        body: 'Anne began coaching in Washington in 1994 across summer league and year-round teams, later expanding into Nevada. Before QSS she coached Sunnyvale SUNN Swimming and consults for SafeSplash Swim School, teaching and training triathletes. She holds credentials in Functional Fitness for Adults with Special Adaptations for Disabilities.',
      },
      {
        title: 'Athlete',
        body: 'Anne swam competitively for 16 years, specializing in fly, back, and IM for Northview Terrace, Big Bend Manta Rays, Lake Forest College, and University of Illinois at Chicago.',
      },
    ],
    philosophy:
      'I believe that swimming is adaptable to all body types and beneficial to all fitness levels.',
  },
] as const

export default function CoachesPage() {
  return (
    <>
      <PageHero
        eyebrow="Staff"
        title="Our coaches"
        lead="Experienced Masters coaches who teach technique, write workouts for mixed abilities, and keep adult swimming welcoming."
      />

      <ContentSection className="mb-8">
        <div className="space-y-16">
          {coaches.map((coach) => (
            <article
              key={coach.name}
              className="border-t border-gray-200 pt-12 first:border-t-0 first:pt-0"
            >
              <Subheading as="h2">{coach.roles}</Subheading>
              <Heading as="h3" className="mt-2">
                {coach.name}
              </Heading>
              <p className="mt-4 text-sm/6">
                <a
                  href={`mailto:${coach.email}`}
                  className="font-medium text-gray-950 underline decoration-gray-300 underline-offset-4"
                >
                  {coach.email}
                </a>
              </p>

              <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
                {coach.sections.map((section) => (
                  <div key={section.title}>
                    <h4 className="text-sm font-semibold text-gray-950">
                      {section.title}
                    </h4>
                    <Prose className="mt-3">
                      <p>{section.body}</p>
                    </Prose>
                  </div>
                ))}
              </div>

              <blockquote className="mt-8 rounded-2xl bg-gray-950/[0.03] p-6 ring-1 ring-black/5 sm:p-8">
                <p className="text-sm font-medium text-gray-500">
                  Philosophy on Masters swimming
                </p>
                <p className="mt-3 text-base/7 font-medium tracking-tight text-gray-950">
                  “{coach.philosophy}”
                </p>
              </blockquote>
            </article>
          ))}
        </div>
      </ContentSection>
    </>
  )
}
