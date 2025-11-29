'use client'

import { ThemeProvider } from '@/components/theme-provider'
import { AuthGuard } from '@/app/(app)/auth-guard'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { DashboardSidebar } from '@/components/workspace/sidebar'
import { useUserJotIdentify } from '@/components/workspace/use-userjot-identify'
import { UserJotLoader } from '@/components/workspace/userjot-loader'
import { useAuth } from '@/hooks/use-auth'
import { UserProfileProvider, useUserProfile } from '@/contexts/user-profile-context'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { usePathname } from 'next/navigation'
import { Toaster } from 'sonner'
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

  // Workspace routes that should have sidebar
  const workspaceRoutes = ['/overview', '/sites', '/settings', '/client-portals']
  const isWorkspaceRoute = workspaceRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
  const isBuilderRoute = pathname.startsWith('/builder/')

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthGuard>
        <UserProfileProvider>
          <WorkspaceProvider>
          <UserJotWithProfile />
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
          </WorkspaceProvider>
        </UserProfileProvider>
      </AuthGuard>
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  )
}

// Separate component to use useUserProfile hook (must be inside UserProfileProvider)
function UserJotWithProfile() {
  const { user } = useAuth()
  const { userAvatar, userName } = useUserProfile()
  
  // Get user data for UserJot (only if user is authenticated and has valid email)
  // Pass null if user is not loaded yet or email is missing to prevent invalid identify calls
  const userData = user && user.email && user.email.trim() !== ''
    ? {
        id: user.id,
        email: user.email,
        firstName: userName?.split(' ')[0] || undefined,
        lastName: userName?.split(' ').slice(1).join(' ') || undefined,
        avatar: userAvatar || undefined,
      }
    : null

  // Identify user with UserJot (only when user is authenticated)
  useUserJotIdentify(userData)
  
  return <UserJotLoader />
}

