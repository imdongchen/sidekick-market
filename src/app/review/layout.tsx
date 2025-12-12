import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Year in Review - Sidekick',
  description: 'Your annual swim review',
  openGraph: {
    title: 'Year in Review - Sidekick',
    description: 'Check out my annual swim review!',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Year in Review - Sidekick',
    description: 'Check out my annual swim review!',
  },
}

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

