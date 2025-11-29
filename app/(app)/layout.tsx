import { ThemeProvider } from '@/components/theme-provider'
import { AuthGuard } from '@/app/(app)/auth-guard'

/**
 * App Root Layout
 * 
 * This layout wraps all authenticated app routes (workspace, builder)
 * - Applies ThemeProvider for admin UI theming
 * - Applies AuthGuard to protect all routes
 * 
 * This is used for app.ottie.com subdomain
 */
export default function AppRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthGuard>{children}</AuthGuard>
    </ThemeProvider>
  )
}

