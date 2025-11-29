import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Ottie App",
  description: "A Next.js 14 fullstack application",
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
      <body className="bg-background text-foreground">
        {children}
        <Analytics />
      </body>
    </html>
  )
}

