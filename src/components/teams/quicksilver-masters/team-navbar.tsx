'use client'

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react'
import { Bars2Icon, XMarkIcon } from '@heroicons/react/24/solid'
import { clsx } from 'clsx'
import { usePathname } from 'next/navigation'
import { Link } from '@/components/link'
import { TEAM_BASE, TEAM_NAME, navLinks } from './constants'

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function TeamNavbar() {
  const pathname = usePathname()

  return (
    <Disclosure as="header" className="pt-10 sm:pt-14">
      {({ open }) => (
        <>
          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Link
                href={TEAM_BASE}
                className="group block min-w-0"
                title={TEAM_NAME}
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                  Sidekick team
                </p>
                <p className="mt-1 truncate text-lg font-medium tracking-tight text-gray-950 group-data-[hover]:text-gray-700 sm:text-xl">
                  {TEAM_NAME}
                </p>
              </Link>
            </div>

            <nav className="hidden items-center gap-1 xl:flex">
              {navLinks.map(({ href, label, ...rest }) => {
                const exact = 'exact' in rest && rest.exact
                const active = isActive(pathname, href, exact)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={clsx(
                      'rounded-lg px-2.5 py-2 text-sm font-medium transition',
                      active
                        ? 'bg-gray-950 text-white'
                        : 'text-gray-700 data-[hover]:bg-black/[4%]',
                    )}
                  >
                    {label}
                  </Link>
                )
              })}
            </nav>

            <DisclosureButton
              className="flex size-11 items-center justify-center rounded-lg data-[hover]:bg-black/5 xl:hidden"
              aria-label={open ? 'Close menu' : 'Open menu'}
            >
              {open ? (
                <XMarkIcon className="size-6" />
              ) : (
                <Bars2Icon className="size-6" />
              )}
            </DisclosureButton>
          </div>

          <DisclosurePanel className="xl:hidden">
            <nav className="mt-6 flex flex-col gap-1 border-t border-black/5 pt-4">
              {navLinks.map(({ href, label, ...rest }) => {
                const exact = 'exact' in rest && rest.exact
                const active = isActive(pathname, href, exact)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={clsx(
                      'rounded-lg px-3 py-2.5 text-base font-medium',
                      active
                        ? 'bg-gray-950 text-white'
                        : 'text-gray-950 data-[hover]:bg-black/[4%]',
                    )}
                  >
                    {label}
                  </Link>
                )
              })}
            </nav>
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  )
}
