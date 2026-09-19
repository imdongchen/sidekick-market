import { Container } from '@/components/container'
import { GradientBackground } from '@/components/gradient'
import { TeamFooter } from '@/components/teams/quicksilver-masters/team-footer'
import { TeamNavbar } from '@/components/teams/quicksilver-masters/team-navbar'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Quicksilver Masters',
    template: '%s - Quicksilver Masters',
  },
  description:
    'Adult swim programs in San Jose — Masters swim team, Adult Learn-to-Swim, and triathlon training with experienced coaches.',
}

export default function QuicksilverMastersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen overflow-hidden bg-white">
      <GradientBackground />
      <Container>
        <TeamNavbar />
      </Container>
      {children}
      <TeamFooter />
    </main>
  )
}
