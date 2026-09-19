export const TEAM_BASE = '/teams/quicksilver-masters'

export const TEAM_NAME = 'Quicksilver Masters'
export const TEAM_TAGLINE = 'Adult swim programs in San Jose'
export const HEAD_COACH_EMAIL = 'megan@swimqss.org'
export const HEAD_COACH_NAME = 'Megan Waters'

export const EXTERNAL = {
  teamPortal: 'https://www.gomotionapp.com/team/pcqsm',
  contactForm:
    'https://www.gomotionapp.com/team/pcqsm/page/system/contactus',
  usmsJoin: 'https://www.usms.org/reg/join/',
  sideBreathingExample:
    'https://www.youtube.com/results?search_query=freestyle+side+breathing',
  flutterKickExample:
    'https://www.youtube.com/results?search_query=flutter+kick+swimming',
} as const

export const navLinks = [
  { href: TEAM_BASE, label: 'Home', exact: true },
  {
    href: `${TEAM_BASE}/swim-team`,
    label: 'Masters',
  },
  {
    href: `${TEAM_BASE}/adult-learn-to-swim`,
    label: 'Learn to Swim',
  },
  {
    href: `${TEAM_BASE}/triathlon`,
    label: 'Triathlon',
  },
  { href: `${TEAM_BASE}/schedules`, label: 'Schedules' },
  { href: `${TEAM_BASE}/coaches`, label: 'Coaches' },
  { href: `${TEAM_BASE}/faq`, label: 'FAQ' },
  { href: `${TEAM_BASE}/contact`, label: 'Contact' },
] as const

export const fitnessRequirement = [
  'Comfortably swim 50 yards freestyle with side breathing',
  '25 yards of backstroke or breaststroke',
  '25 yards of flutter kick on the back',
] as const

export const locations = [
  {
    name: 'Gunderson High School',
    short: 'GHS',
    address: '622 Gaundabert Ln',
    city: 'San Jose, CA 95136',
  },
  {
    name: 'Almaden Swim & Racquet Club',
    short: 'ASRC',
    address: '6604 Northridge Dr',
    city: 'San Jose, CA 95120',
  },
  {
    name: 'Pinehurst Cabana Club',
    short: 'PH',
    address: '886 Lewiston Dr',
    city: 'San Jose, CA 95136',
  },
] as const
