'use client'

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { DashboardSidebar } from '@/components/workspace/sidebar'
import { useUserJotIdentify } from '@/components/workspace/use-userjot-identify'
import { UserJotLoader } from '@/components/workspace/userjot-loader'
import { useAuth } from '@/hooks/use-auth'
import '../../sphere.css'

/**
 * Workspace Layout
 * 
 * This layout applies to ALL workspace pages, including:
 * - /overview
 * - /sites
 * - /settings
 * - /client-portals
 * - Any future subpages (e.g., /analytics, /billing, etc.)
 * 
 * Note: ThemeProvider and AuthGuard are handled by the parent (app)/layout.tsx
 * The FeedbackSheet with UserJot widget is available globally across all workspace pages.
 */
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()

  // Get user data for UserJot
  const userData = user
    ? {
        id: user.id,
        email: user.email || '',
        firstName: user.user_metadata?.full_name?.split(' ')[0] || '',
        lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        avatar: user.user_metadata?.avatar_url || '',
      }
    : {
        id: '',
        email: '',
        firstName: '',
        lastName: '',
        avatar: '',
      }

  // Identify user with UserJot
  useUserJotIdentify(userData)

  return (
    <>
      <UserJotLoader />
      <SidebarProvider>
        <DashboardSidebar />
        <SidebarInset className="h-screen overflow-hidden">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}
