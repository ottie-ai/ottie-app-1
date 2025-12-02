'use client'

import { ThemeProvider } from '@/components/theme-provider'
import { QueryProvider } from '@/providers/query-provider'
import { AuthGuard } from '@/app/(app)/auth-guard'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { DashboardSidebar } from '@/components/workspace/sidebar'
import { useUserJotIdentify } from '@/components/workspace/use-userjot-identify'
import { UserJotLoader } from '@/components/workspace/userjot-loader'
import { useAuth } from '@/hooks/use-auth'
import { AppProvider, useUserProfile, useAppData } from '@/contexts/app-context'
import { usePathname } from 'next/navigation'
import { Toaster } from 'sonner'
import '../sphere.css'
import { useEffect } from 'react'
import Intercom from '@intercom/messenger-js-sdk'
import { LottieSpinner } from '@/components/ui/lottie-spinner'

/**
 * App Root Layout (Client Component - SPA style)
 * 
 * OPTIMIZATION: Changed to Client Component to eliminate server-side data fetching on every navigation
 * - AppProvider fetches data client-side via React Query (cached, no duplicate requests)
 * - No server-side getUser() or loadAppData() calls on navigation
 * - Instant navigation between pages (SPA-like experience)
 * 
 * This layout wraps all authenticated app routes (workspace, builder)
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
  const pathname = usePathname()

  // Workspace routes that should have sidebar
  const workspaceRoutes = ['/dashboard', '/sites', '/leads', '/settings', '/client-portals']
  const isWorkspaceRoute = workspaceRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))

  return (
    <QueryProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthGuard>
          {/* AppProvider without initialData - fetches via React Query (cached) */}
          <AppProvider>
            <AppContent isWorkspaceRoute={isWorkspaceRoute}>
              {children}
            </AppContent>
          </AppProvider>
        </AuthGuard>
        <Toaster position="top-right" richColors />
      </ThemeProvider>
    </QueryProvider>
  )
}

// AppContent - Shows loading screen while app data is loading
function AppContent({ 
  children, 
  isWorkspaceRoute 
}: { 
  children: React.ReactNode
  isWorkspaceRoute: boolean
}) {
  const { loading, currentWorkspace, profile } = useAppData()
  const { user, loading: authLoading } = useAuth()

  // Show loading screen while:
  // 1. Auth is loading, OR
  // 2. User is authenticated but app data is loading AND we don't have essential data yet
  // Essential data: profile AND workspace (both are required for app to function)
  // This prevents showing empty UI with missing data and flickering between states
  // Only show loading on initial load (when we don't have data yet), not on background refetches
  const hasEssentialData = !!(profile && currentWorkspace)
  const isInitialLoad = !hasEssentialData && user?.id
  // Show loading only if we're actually loading AND it's initial load (not background refetch)
  const shouldShowLoading = authLoading || (loading && isInitialLoad && !hasEssentialData)

  if (shouldShowLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <LottieSpinner size={32} />
          <p className="text-sm text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <UserJotWithProfile />
      <IntercomWithProfile />
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
    </>
  )
}

// Separate component to use useUserProfile hook (must be inside AppProvider)
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

// Separate component to initialize Intercom (must be inside AppProvider)
function IntercomWithProfile() {
  const { user } = useAuth()
  const { profile, userName } = useUserProfile()
  const pathname = usePathname()
  
  // Don't initialize Intercom on builder routes
  const isBuilderRoute = pathname.startsWith('/builder/')
  
  useEffect(() => {
    // Skip if builder route or user not loaded
    if (isBuilderRoute || !user?.id) return

    // Fetch JWT token from API
    const initializeIntercom = async () => {
      try {
        const response = await fetch('/api/intercom/jwt')
        if (!response.ok) {
          console.error('Failed to get Intercom JWT token')
          return
        }

        const { token } = await response.json()

        // Initialize Intercom with JWT token for authenticated users
        // This enables identity verification and shows home/messenger tabs
        // Use Intercom() function (not .boot()) with intercom_user_jwt parameter
        Intercom({
          api_base: 'https://api-iam.intercom.io',
          app_id: 'r9srnf09',
          intercom_user_jwt: token, // JWT token enables identity verification
          // Non-sensitive attributes can be included directly
          name: userName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          created_at: user.created_at ? Math.floor(new Date(user.created_at).getTime() / 1000) : undefined,
          session_duration: 86400000, // 1 day
        })
      } catch (error) {
        console.error('Error initializing Intercom:', error)
      }
    }

    initializeIntercom()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.email, user?.created_at, userName, isBuilderRoute])
  
  return null
}

