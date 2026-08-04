import { Logo } from '@/components/logo'
import { Link } from '@/components/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  description:
    'Sidekick helps swim teams track workouts, stay connected, and manage schedules and rosters.',
}

const previews = [
  {
    id: 'feed',
    src: '/screenshots/appstore_preview_feed.png',
    alt: 'Team feed — check-ins, stats, and personal records',
  },
  {
    id: 'schedule',
    src: '/screenshots/appstore_preview_schedule.png',
    alt: 'Team schedule — practices and workout planning',
  },
  {
    id: 'profile',
    src: '/screenshots/appstore_preview_profile.png',
    alt: 'Profile — monthly, yearly, and lifetime swim stats',
  },
] as const

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07131f] text-[#e8f2f8]">
      {/* Atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-10%,#1a6d8f_0%,transparent_55%),radial-gradient(ellipse_60%_50%_at_100%_40%,#0d3d5c_0%,transparent_50%),radial-gradient(ellipse_50%_40%_at_0%_80%,#0a4a5e_0%,transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,#07131f_92%)]" />
        <div className="hero-shimmer absolute -left-1/4 top-1/4 h-[50rem] w-[50rem] rounded-full bg-[radial-gradient(circle,rgba(94,196,220,0.14)_0%,transparent_65%)] blur-2xl" />
        <div className="hero-shimmer-delayed absolute -right-1/4 bottom-0 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,rgba(56,140,180,0.12)_0%,transparent_65%)] blur-2xl" />
        {/* subtle depth lines */}
        <div className="absolute inset-x-0 top-[18%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute inset-x-0 top-[52%] h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        <header className="hero-fade-in flex items-center justify-between gap-6 px-6 pt-8 sm:px-10 sm:pt-10 lg:px-14">
          <Link
            href="/"
            title="Home"
            className="inline-flex [&_path]:fill-white [&_span]:text-white"
          >
            <Logo className="h-8 sm:h-9" />
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium tracking-wide text-white/40 transition hover:text-white/80"
          >
            Admin login
          </Link>
        </header>

        <main className="flex flex-1 flex-col justify-between gap-12 pb-10 pt-10 sm:gap-16 sm:pb-14 sm:pt-14 lg:gap-20 lg:pt-16">
          <div className="px-6 sm:px-10 lg:px-14">
            <div className="max-w-3xl">
              <h1 className="hero-fade-in hero-delay-1 font-display text-[clamp(3.5rem,12vw,8.5rem)] font-medium leading-[0.85] tracking-tight text-white">
                Sidekick
              </h1>
              <p className="hero-fade-in hero-delay-2 mt-6 text-balance text-2xl font-medium tracking-tight text-white/90 sm:mt-8 sm:text-3xl lg:text-4xl">
                Swim app for teams
              </p>
              <p className="hero-fade-in hero-delay-3 mt-4 max-w-md text-base leading-relaxed text-white/55 sm:mt-5 sm:text-lg">
                Track workouts together, share the schedule, and keep every
                swimmer in the loop.
              </p>

              <div className="hero-fade-in hero-delay-4 mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 sm:mt-10">
                <Link
                  href="https://apps.apple.com/us/app/sidekick-swim-app-for-teams/id6677036644"
                  className="transition duration-300 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/40"
                >
                  <img
                    alt="Download on the App Store"
                    src="/download-on-the-app-store.svg"
                    className="h-12 sm:h-14"
                    width={168}
                    height={56}
                  />
                </Link>
                <p className="text-sm font-medium tracking-wide text-white/40">
                  Android — coming soon
                </p>
              </div>
            </div>
          </div>

          <div className="hero-fade-in hero-delay-5">
            <div className="flex gap-3 overflow-x-auto px-6 pb-2 sm:gap-5 sm:px-10 lg:justify-center lg:px-14 lg:pb-0">
              {previews.map((preview, index) => (
                <figure
                  key={preview.id}
                  className="hero-phone shrink-0"
                  style={{ animationDelay: `${0.55 + index * 0.12}s` }}
                >
                  <img
                    src={preview.src}
                    alt={preview.alt}
                    width={1242}
                    height={2688}
                    className="h-[min(52vh,26rem)] w-auto select-none sm:h-[min(58vh,32rem)] lg:h-[min(62vh,36rem)]"
                    draggable={false}
                  />
                </figure>
              ))}
            </div>
          </div>
        </main>

        <footer className="hero-fade-in hero-delay-6 relative px-6 pb-8 text-sm text-white/35 sm:px-10 lg:px-14">
          <p>
            Questions?{' '}
            <a
              href="mailto:admin@sidekickswim.com"
              className="text-white/50 underline decoration-white/20 underline-offset-4 transition hover:text-white/80"
            >
              admin@sidekickswim.com
            </a>
          </p>
        </footer>
      </div>
    </div>
  )
}
