import { Button } from '@/components/button'
import { Heading, Subheading } from '@/components/text'
import { ContactForm } from '@/components/teams/quicksilver-masters/contact-form'
import {
  EXTERNAL,
  HEAD_COACH_EMAIL,
  HEAD_COACH_NAME,
  locations,
} from '@/components/teams/quicksilver-masters/constants'
import {
  ContentSection,
  PageHero,
  Prose,
} from '@/components/teams/quicksilver-masters/ui'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact Quicksilver Masters — email Head Coach Megan Waters or send a message about adult swim programs in San Jose.',
}

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Info"
        title="Contact us"
        lead="Questions about programs, tryouts, registration, or pool access? Reach the coaching staff — we typically reply within two business days."
      />

      <ContentSection className="mb-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Subheading>Direct</Subheading>
            <Heading as="h2" className="mt-2">
              Talk to a coach
            </Heading>
            <Prose className="mt-6">
              <p>
                Head Coach {HEAD_COACH_NAME} is the best first contact for
                program fit, tryouts, cancellations, and account holds.
              </p>
            </Prose>
            <div className="mt-8 space-y-4">
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <p className="text-sm text-gray-500">Email</p>
                <a
                  href={`mailto:${HEAD_COACH_EMAIL}`}
                  className="mt-1 block text-lg font-medium tracking-tight text-gray-950"
                >
                  {HEAD_COACH_EMAIL}
                </a>
              </div>
              <Button href={EXTERNAL.contactForm} variant="secondary">
                Open team portal contact form
              </Button>
            </div>

            <div className="mt-12">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-500">
                Pool locations
              </h3>
              <ul className="mt-4 space-y-4">
                {locations.map((location) => (
                  <li key={location.name} className="text-sm/6 text-gray-600">
                    <span className="font-medium text-gray-950">
                      {location.name}
                    </span>
                    <br />
                    {location.address}, {location.city}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl bg-gray-950/[0.03] p-6 ring-1 ring-black/5 sm:p-8">
            <Subheading as="h2">Send a message</Subheading>
            <p className="mt-3 text-sm/6 text-gray-600">
              Submit questions or comments and we will follow up by email.
            </p>
            <div className="mt-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </ContentSection>
    </>
  )
}
