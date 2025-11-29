import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Ottie - Real Estate Client Portal Generator',
    template: '%s | Ottie',
  },
  description: 'Create beautiful, professional real estate client portals in minutes. Generate stunning property websites with AI-powered tools.',
}

/**
 * Homepage Layout
 * 
 * This layout isolates the homepage from global theme provider.
 * Homepage has its own hardcoded dark styling and should NOT be
 * affected by admin UI theme changes.
 */
export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

