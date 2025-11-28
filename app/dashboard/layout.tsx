'use client'

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { useUserJotIdentify } from '@/components/dashboard/use-userjot-identify'
import { UserJotLoader } from '@/components/dashboard/userjot-loader'
import '../sphere.css'

/**
 * Dashboard Layout
 * 
 * This layout applies to ALL pages under /dashboard, including:
 * - /dashboard (home)
 * - /dashboard/pages
 * - /dashboard/settings
 * - /dashboard/client-portals
 * - Any future subpages (e.g., /dashboard/analytics, /dashboard/billing, etc.)
 * 
 * The FeedbackSheet with UserJot widget is available globally across all dashboard pages.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // TODO: Replace with actual user data from auth system
  // For now using hardcoded user data from sidebar
  const user = {
    id: 'user-123', // TODO: Get from auth
    email: 'john@example.com', // TODO: Get from auth
    firstName: 'John', // TODO: Get from auth
    lastName: 'Doe', // TODO: Get from auth
    avatar: '', // TODO: Get from auth
  }

  // Identify user with UserJot
  useUserJotIdentify(user)

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

