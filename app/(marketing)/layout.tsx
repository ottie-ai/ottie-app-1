// Configure max duration for server actions (180 seconds / 3 minutes)
// This allows scraper calls to complete without timing out
export const maxDuration = 180

import type { Metadata } from 'next'

/**
 * Metadata for Marketing Routes (ottie.com)
 * 
 * Marketing routes are PUBLIC and should be indexed by Google
 * - robots: index, follow - allows Google indexing
 * - Public access, SEO optimized
 */
export const metadata: Metadata = {
  title: {
    default: 'Ottie - Real Estate Client Portal Generator',
    template: '%s | Ottie',
  },
  description: 'Create beautiful, professional real estate client portals in minutes. Generate stunning property websites with AI-powered tools.',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
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

