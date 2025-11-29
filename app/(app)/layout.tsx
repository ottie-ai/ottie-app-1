'use client'

import { ThemeProvider } from '@/components/theme-provider'
import { AuthGuard } from '@/app/(app)/auth-guard'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { DashboardSidebar } from '@/components/workspace/sidebar'
import { useUserJotIdentify } from '@/components/workspace/use-userjot-identify'
import { UserJotLoader } from '@/components/workspace/userjot-loader'
import { useAuth } from '@/hooks/use-auth'
import { usePathname } from 'next/navigation'
import '../sphere.css'

/**
 * App Root Layout
 * 
 * This layout wraps all authenticated app routes (workspace, builder)
 * - Applies ThemeProvider for admin UI theming
 * - Applies AuthGuard to protect all routes
 * - Applies Sidebar for workspace routes (overview, sites, settings, client-portals)
 * 
 * This is used for app.ottie.com subdomain
 */
export default function AppRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user } = useAuth()

  // Workspace routes that should have sidebar
  const workspaceRoutes = ['/overview', '/sites', '/settings', '/client-portals']
  const isWorkspaceRoute = workspaceRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
  const isBuilderRoute = pathname.startsWith('/builder/')

  // Get user data for UserJot (only if user is authenticated)
  // Pass null if user is not loaded yet to prevent invalid identify calls
  const userData = user
    ? {
        id: user.id,
        email: user.email || '',
        firstName: user.user_metadata?.full_name?.split(' ')[0] || '',
        lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        avatar: user.user_metadata?.avatar_url || '',
      }
    : null

  // Identify user with UserJot (only when user is authenticated)
  useUserJotIdentify(userData)

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthGuard>
        <UserJotLoader />
        {isWorkspaceRoute ? (
          <SidebarProvider>
            <DashboardSidebar />
            <SidebarInset className="h-screen overflow-hidden">
              {children}
            </SidebarInset>
          </SidebarProvider>
        ) : (
          children
        )}
      </AuthGuard>
    </ThemeProvider>
  )
}

