import { Container } from '@/components/container'
import { Gradient } from '@/components/gradient'
import { Link } from '@/components/link'
import { Navbar } from '@/components/navbar'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  description:
    'Sidekick helps a swim team track their workout, stay connected, and manage schedules and roasters.',
}

const previewSections = [
  {
    id: 'feed',
    src: '/screenshots/appstore_preview_feed.png',
    alt: 'Track your team’s workouts together — see check-ins, stats, and celebrate PRs',
  },
  {
    id: 'schedule',
    src: '/screenshots/appstore_preview_schedule.png',
    alt: 'Never miss a workout — view team schedule and plan your swims',
  },
  {
    id: 'profile',
    src: '/screenshots/appstore_preview_profile.png',
    alt: 'Track your swimming progress — monthly, yearly, and lifetime stats at a glance',
  },
] as const

function Hero() {
  return (
    <div className="relative">
      <Gradient className="absolute inset-0 bottom-0 ring-1 ring-inset ring-black/5" />
      <Container className="relative">
        <Navbar
          banner={
            <Link
              href="#"
              className="flex items-center gap-1 rounded-full bg-fuchsia-950/35 px-3 py-0.5 text-sm/6 font-medium text-white data-[hover]:bg-fuchsia-950/30"
            >
              Beta
            </Link>
          }
        />
        <div className="pt-16 sm:pt-24 md:pt-32">
          <h1 className="font-display text-balance text-6xl/[0.9] font-medium leading-tight tracking-tight text-gray-950 sm:text-8xl/[0.8] sm:leading-none md:text-9xl/[0.8] md:leading-none">
            Swim app for teams
          </h1>
          <p className="mt-8 max-w-lg text-xl/7 font-medium text-gray-950/75 sm:text-2xl/8">
            Sidekick helps a swim team track their workout, stay connected, and
            manage schedules and roasters.
          </p>
          <div className="mt-12 flex flex-col gap-x-6 gap-y-4 sm:flex-row">
            <Link href="https://apps.apple.com/us/app/sidekick-swim-app-for-teams/id6677036644">
              <img
                alt="Download on the App Store"
                src="/download-on-the-app-store.svg"
                className="h-14"
              />
            </Link>
            <Link href="https://github.com/imdongchen/sidekick-market/releases/download/android%401.6.27/sidekick-android.aab">
              <img
                alt="Download Android app"
                src="/download-android.png"
                className="h-14"
              />
            </Link>
          </div>
          <p className="mt-8">
            *The Android app is currently in beta testing and not yet publicly
            available on Google Play. You can download and install it directly
            from the link above. Not working? Try downloading{' '}
            <u>
              <Link href="https://github.com/imdongchen/sidekick-market/releases/download/android%401.6.28/build-1749947550072.apk">
                this APK
              </Link>
            </u>{' '}
            instead.
          </p>
          <p className="mt-8">
            Contact <u>admin@sidekickswim.com</u> for help.
          </p>
        </div>
      </Container>
      <div className="relative mt-12 flex gap-4 overflow-x-auto px-6 pb-10 lg:px-8">
        {previewSections.map((section) => (
          <img
            key={section.id}
            src={section.src}
            alt={section.alt}
            width={1242}
            height={2688}
            className="h-[28rem] w-auto shrink-0 sm:h-[36rem] lg:h-[42rem]"
          />
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  return <Hero />
}
