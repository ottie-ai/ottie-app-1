'use client'

import { ThemeProvider } from '@/components/theme-provider'
import { QueryProvider } from '@/providers/query-provider'
import { AuthGuard } from '@/app/(app)/auth-guard'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { DashboardSidebar } from '@/components/workspace/sidebar'
import { useUserJotIdentify } from '@/components/workspace/use-userjot-identify'
import { UserJotLoader } from '@/components/workspace/userjot-loader'
import { useAuth } from '@/hooks/use-auth'
import { AppProvider, useUserProfile } from '@/contexts/app-context'
import { usePathname } from 'next/navigation'
import { Toaster } from 'sonner'
import type { Profile, Workspace, Membership } from '@/types/database'
import '../sphere.css'
import { useEffect } from 'react'
import Intercom from '@intercom/messenger-js-sdk'

interface AppLayoutClientProps {
  children: React.ReactNode
  initialAppData: {
    profile: Profile | null
    currentWorkspace: Workspace | null
    currentMembership: Membership | null
    allWorkspaces: Array<{ workspace: Workspace; role: string }>
  }
}

/**
 * Client component for app layout
 * Receives initial app data from server component wrapper
 */
export function AppLayoutClient({ children, initialAppData }: AppLayoutClientProps) {
  const pathname = usePathname()

  // Workspace routes that should have sidebar
  const workspaceRoutes = ['/dashboard', '/sites', '/leads', '/settings', '/client-portals']
  const isWorkspaceRoute = workspaceRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
  const isBuilderRoute = pathname.startsWith('/builder/')

  return (
    <QueryProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthGuard>
          <AppProvider initialData={initialAppData}>
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
          </AppProvider>
        </AuthGuard>
        <Toaster position="top-right" richColors />
      </ThemeProvider>
    </QueryProvider>
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

        // Initialize Intercom with JWT token
        Intercom({
          api_base: 'https://api-iam.intercom.io',
          app_id: 'r9srnf09',
          intercom_user_jwt: token,
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

