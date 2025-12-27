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
 * - Focus on FREE TIER messaging
 */
export const metadata: Metadata = {
  title: {
    default: 'Ottie: Property Websites in 60 Seconds | Free for Realtors',
    template: '%s | Ottie',
  },
  description: 'Free: 3 property websites/month. Copy listing link, get professional site with photos, map, contact form. No card required.',
  keywords: 'property website, realtor marketing, listing page, real estate leads, free realtor tool, property one-pager, sell house faster',
  authors: [{ name: 'Ottie' }],
  creator: 'Ottie',
  publisher: 'Ottie',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ottie.com',
    siteName: 'Ottie',
    title: 'Ottie: Property Websites in 60 Seconds | Free for Realtors',
    description: 'Free: 3 property websites/month. Copy listing link, get professional site with photos, map, contact form. No card required.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Ottie - Property websites in 60 seconds',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ottie: Property Websites in 60 Seconds',
    description: 'Free: 3 property websites/month. Copy listing link, get professional site. No card required.',
    images: ['/og-image.png'],
    creator: '@ottieapp',
  },
  alternates: {
    canonical: 'https://ottie.com',
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

