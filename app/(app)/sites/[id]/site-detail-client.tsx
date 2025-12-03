'use client'

import { useEffect, useRef } from 'react'
import { Site } from '@/types/database'
import { SitePreview } from './site-preview'
import { SiteSettingsPanel } from './site-settings-panel'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

const SIDEBAR_RESTORE_KEY = 'site_detail_restore_sidebar'

interface SiteDetailClientProps {
  site: Site
  members: Array<{
    membership: { user_id: string }
    profile: { avatar_url: string | null; full_name: string | null; email: string | null }
  }>
}

export function SiteDetailClient({ site, members }: SiteDetailClientProps) {
  const sidebar = useSidebar()
  const hasInitializedRef = useRef(false)

  // On mount: store previous state and collapse sidebar
  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    // Store current state to restore later
    sessionStorage.setItem(SIDEBAR_RESTORE_KEY, JSON.stringify({
      open: sidebar.open,
      openMobile: sidebar.openMobile,
    }))
    console.log('[SiteDetail] Stored state:', { open: sidebar.open, openMobile: sidebar.openMobile })

    // Collapse sidebar
    setTimeout(() => {
      if (!sidebar.isMobile) {
        sidebar.setOpen(false)
      } else {
        sidebar.setOpenMobile(false)
      }
    }, 50)

    // On unmount: mark that we need to restore
    return () => {
      // Set flag to restore on next page
      const stored = sessionStorage.getItem(SIDEBAR_RESTORE_KEY)
      if (stored) {
        sessionStorage.setItem(SIDEBAR_RESTORE_KEY + '_pending', stored)
      }
      sessionStorage.removeItem(SIDEBAR_RESTORE_KEY)
    }
  }, [sidebar])

  return (
    <div className="flex flex-col h-full">
      {/* Header with Breadcrumbs */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumbs
          items={[
            { label: 'Sites', href: '/sites' },
            { label: site.title, href: `/sites/${site.id}` },
          ]}
        />
      </header>

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Settings Panel */}
        <div className="w-96 border-r bg-background overflow-y-auto">
          <SiteSettingsPanel site={site} members={members} />
        </div>

        {/* Right Side - Preview */}
        <div className="flex-1 relative overflow-hidden">
          <SitePreview site={site} />
        </div>
      </div>
    </div>
  )
}

