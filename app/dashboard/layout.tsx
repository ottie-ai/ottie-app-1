'use client'

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import '../sphere.css'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="h-screen overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}

