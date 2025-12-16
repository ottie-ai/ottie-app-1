import type { Metadata } from "next"
import { AnalyticsWrapper } from "@/components/analytics-wrapper"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Ottie - Real Estate Client Portal Generator",
    template: "%s | Ottie",
  },
  description: "Create beautiful, professional real estate client portals in minutes. Generate stunning property websites with AI-powered tools.",
  keywords: ["real estate", "property websites", "client portals", "real estate marketing", "property listings"],
  icons: {
    icon: '/images/favicon.png',
    apple: '/images/favicon.png',
  },
}

/**
 * Root Layout
 * 
 * NOTE: ThemeProvider is NOT included here to allow different pages
 * to have their own theme handling:
 * - Dashboard: Has its own layout with ThemeProvider
 * - Editor: Has its own layout with ThemeProvider (only for admin UI)
 * - Homepage: No ThemeProvider (uses hardcoded dark styling)
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <AnalyticsWrapper />
      </body>
    </html>
  )
}

