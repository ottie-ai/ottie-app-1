import type { Metadata } from 'next'
import AppRootLayoutClient from './layout-client'

/**
 * Server Component Wrapper for App Layout
 * 
 * This wrapper is needed to export metadata (which requires server component)
 * The actual layout logic is in layout-client.tsx (client component)
 * 
 * CRITICAL: App routes are PRIVATE and should NOT be indexed by Google
 * - Only authenticated users can access (enforced by AuthGuard)
 * - robots: noindex, nofollow - prevents Google from indexing
 * - No public access, no SEO needed
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function AppRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppRootLayoutClient>{children}</AppRootLayoutClient>
}

