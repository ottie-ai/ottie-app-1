import { AppLayoutWrapper } from './app-layout-wrapper'

/**
 * App Root Layout (Server Component)
 * 
 * This layout wraps all authenticated app routes (workspace, builder)
 * - Loads app data server-side for immediate availability
 * - Applies ThemeProvider for admin UI theming
 * - Applies AuthGuard to protect all routes
 * - Applies Sidebar for workspace routes (dashboard, sites, settings, client-portals)
 * 
 * This is used for app.ottie.com subdomain
 */
export default function AppRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayoutWrapper>{children}</AppLayoutWrapper>
}

