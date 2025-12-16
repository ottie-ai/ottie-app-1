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
import { useTheme } from 'next-themes'
import '../sphere.css'
import { useEffect, useState } from 'react'
import Intercom from '@intercom/messenger-js-sdk'
import { LottieSpinner } from '@/components/ui/lottie-spinner'
import Head from 'next/head'
import { WorkspaceLockBanner } from '@/components/workspace/workspace-lock-banner'
import { ForcedPricingDialog } from '@/components/workspace/forced-pricing-dialog'

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
// Toast component that uses theme
function ThemedToaster() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <Toaster 
      position="top-center" 
      richColors 
      theme={mounted && resolvedTheme === 'dark' ? 'dark' : 'light'}
    />
  )
}

export default function AppRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Workspace routes that should have sidebar
  // Builder routes are in separate (builder) route group, so they don't inherit this layout
  // Preview routes have their own full-screen layout
  const workspaceRoutes = ['/dashboard', '/sites', '/leads', '/settings', '/client-portals']
  const isPreviewRoute = pathname?.startsWith('/preview/')
  const isWorkspaceRoute = !isPreviewRoute && workspaceRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))

  // Apply workspace-body class only for workspace routes (for background)
  useEffect(() => {
    if (isWorkspaceRoute) {
      document.body.classList.add('workspace-body')
    } else {
      document.body.classList.remove('workspace-body')
    }
  }, [isWorkspaceRoute])

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
            <AppContent isWorkspaceRoute={isWorkspaceRoute} isPreviewRoute={isPreviewRoute}>
              {children}
            </AppContent>
          </AppProvider>
        </AuthGuard>
        <ThemedToaster />
      </ThemeProvider>
    </QueryProvider>
  )
}

// AppContent - Shows loading screen while app data is loading
function AppContent({ 
  children, 
  isWorkspaceRoute,
  isPreviewRoute
}: { 
  children: React.ReactNode
  isWorkspaceRoute: boolean
  isPreviewRoute: boolean
}) {
  const { loading: appDataLoading, currentWorkspace, profile } = useAppData()
  const { user, loading: authLoading, initialized } = useAuth()

  // Show loading screen while:
  // 1. Auth is not initialized yet (prevents flash of unauthenticated state), OR
  // 2. Auth is loading, OR
  // 3. User is authenticated but we don't have essential data yet (profile AND workspace)
  // This prevents showing empty UI with missing data and flickering between states
  const hasEssentialData = !!(profile && currentWorkspace)
  
  // For preview routes, only wait for auth to load
  // They don't need workspace data to render (they fetch site data themselves)
  // Builder routes are in separate (builder) route group, so they don't use this layout
  const shouldShowLoadingForPreview = !initialized || authLoading
  
  // For workspace routes, wait for auth + workspace data
  const shouldShowLoadingForWorkspace = !initialized || authLoading || (user?.id && !hasEssentialData)

  if (isPreviewRoute && shouldShowLoadingForPreview) {
    // For preview routes, show nothing while auth is loading
    // Preview will handle its own loading state once auth is ready
    return null
  }

  if (!isPreviewRoute && shouldShowLoadingForWorkspace) {
    // For workspace routes, show full loading with workspace background
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <LottieSpinner size={32} />
          <p className="text-sm text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  // Check if workspace is locked (matches server-side logic in workspace-data.ts)
  const isWorkspaceLocked = currentWorkspace && (() => {
    if (!currentWorkspace) return false
    
    // Check if over seats limit
    if (currentWorkspace.seats_used > currentWorkspace.seats_limit) {
      return true
    }
    
    // Check subscription status
    if (currentWorkspace.subscription_status === 'unpaid' || currentWorkspace.subscription_status === 'canceled') {
      // Check if grace period expired
      if (currentWorkspace.grace_period_ends_at) {
        const graceEnds = new Date(currentWorkspace.grace_period_ends_at)
        return graceEnds < new Date()
      }
      return true
    }
    
    // If in grace period, check if it's expired
    if (currentWorkspace.subscription_status === 'grace_period' && currentWorkspace.grace_period_ends_at) {
      const graceEnds = new Date(currentWorkspace.grace_period_ends_at)
      return graceEnds < new Date()
    }
    
    return false
  })()
  
  return (
    <>
      <UserJotWithProfile />
      <IntercomWithProfile />
      {isWorkspaceRoute ? (
        <SidebarProvider>
          <DashboardSidebar />
          <SidebarInset className="h-screen">
            {isWorkspaceLocked && currentWorkspace && (
              <>
                <WorkspaceLockBanner workspaceId={currentWorkspace.id} />
                <ForcedPricingDialog workspaceId={currentWorkspace.id} />
              </>
            )}
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
  
  // Don't initialize Intercom on preview routes (preview pages should be clean without admin elements)
  // But allow on /sites/[id] (edit site page) and other admin routes
  const isPreviewRoute = pathname.startsWith('/preview/')
  
  useEffect(() => {
    // Skip if preview route or user not loaded
    if (isPreviewRoute || !user?.id) {
      // Hide Intercom on preview routes
      if (isPreviewRoute && typeof window !== 'undefined' && (window as any).Intercom) {
        (window as any).Intercom('shutdown')
      }
      return
    }

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
        // Use Intercom() function with intercom_user_jwt parameter
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
  }, [user?.id, user?.email, user?.created_at, userName, isPreviewRoute])
  
  return null
}

