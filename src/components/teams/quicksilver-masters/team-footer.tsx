import { Button } from '@/components/button'
import { Container } from '@/components/container'
import { Copyright } from '@/components/footer'
import { Gradient } from '@/components/gradient'
import { Link } from '@/components/link'
import { PlusGrid, PlusGridItem, PlusGridRow } from '@/components/plus-grid'
import { Subheading } from '@/components/text'
import {
  EXTERNAL,
  HEAD_COACH_EMAIL,
  TEAM_BASE,
  TEAM_NAME,
  navLinks,
} from './constants'

export function TeamFooter() {
  return (
    <footer className="mt-24">
      <Gradient className="relative">
        <div className="absolute inset-2 rounded-4xl bg-white/80" />
        <Container>
          <div className="relative pb-16 pt-20 text-center sm:py-24">
            <hgroup>
              <Subheading>Get in the water</Subheading>
              <p className="mt-6 text-3xl font-medium tracking-tight text-gray-950 sm:text-5xl">
                Ready to join {TEAM_NAME}?
              </p>
            </hgroup>
            <p className="mx-auto mt-6 max-w-md text-sm/6 text-gray-500">
              Email Head Coach Megan Waters to arrange a tryout, ask about
              programs, or get registration help.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button href={`mailto:${HEAD_COACH_EMAIL}`}>
                Email {HEAD_COACH_EMAIL}
              </Button>
              <Button href={EXTERNAL.teamPortal} variant="secondary">
                Team portal
              </Button>
            </div>
          </div>

          <PlusGrid className="pb-16">
            <PlusGridRow>
              <div className="grid grid-cols-2 gap-y-10 pb-6 sm:grid-cols-3 lg:grid-cols-4 lg:gap-8">
                <div className="col-span-2 sm:col-span-1">
                  <Link href={TEAM_BASE} className="text-sm font-medium text-gray-950">
                    {TEAM_NAME}
                  </Link>
                  <p className="mt-3 max-w-xs text-sm/6 text-gray-500">
                    Adult swim, triathlon, and learn-to-swim programs in San
                    Jose.
                  </p>
                </div>
                <div>
                  <h3 className="text-sm/6 font-medium text-gray-950/50">
                    Explore
                  </h3>
                  <ul className="mt-4 space-y-3 text-sm/6">
                    {navLinks.slice(0, 4).map(({ href, label }) => (
                      <li key={href}>
                        <Link
                          href={href}
                          className="font-medium text-gray-950 data-[hover]:text-gray-950/75"
                        >
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm/6 font-medium text-gray-950/50">
                    Info
                  </h3>
                  <ul className="mt-4 space-y-3 text-sm/6">
                    {navLinks.slice(4).map(({ href, label }) => (
                      <li key={href}>
                        <Link
                          href={href}
                          className="font-medium text-gray-950 data-[hover]:text-gray-950/75"
                        >
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm/6 font-medium text-gray-950/50">
                    Powered by
                  </h3>
                  <ul className="mt-4 space-y-3 text-sm/6">
                    <li>
                      <Link
                        href="/"
                        className="font-medium text-gray-950 data-[hover]:text-gray-950/75"
                      >
                        Sidekick
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </PlusGridRow>
            <PlusGridRow className="flex justify-between">
              <PlusGridItem className="py-3">
                <Copyright />
              </PlusGridItem>
            </PlusGridRow>
          </PlusGrid>
        </Container>
      </Gradient>
    </footer>
  )
}
