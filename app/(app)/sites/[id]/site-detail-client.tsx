'use client'

import { useEffect, useRef, useState } from 'react'
import { Site } from '@/types/database'
import { SitePreview } from './site-preview'
import { SiteSettingsPanel } from './site-settings-panel'
import { handlePublishSite, handleUnpublishSite } from '@/app/actions/site-actions'
import { toast } from 'sonner'
import { toastSuccess } from '@/lib/toast-helpers'
import { useRouter } from 'next/navigation'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { ChevronsUpDown, Settings, ExternalLink } from 'lucide-react'
import { normalizePlan } from '@/lib/utils'
import { useAppData, useUserProfile, useWorkspace } from '@/contexts/app-context'
import * as React from 'react'

const SIDEBAR_RESTORE_KEY = 'site_detail_restore_sidebar'

interface SiteDetailClientProps {
  site: Site
  members: Array<{
    membership: { user_id: string }
    profile: { avatar_url: string | null; full_name: string | null; email: string | null }
  }>
}

// Hoverable Tabs List with animated background
function HoverableTabsList({ children }: { children: React.ReactNode }) {
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 })
  const tabsListRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const updateIndicator = (target: HTMLElement | null) => {
    if (!target || !tabsListRef.current) {
      setIndicatorStyle(prev => ({ ...prev, opacity: 0 }))
      return
    }

    const list = tabsListRef.current
    const listRect = list.getBoundingClientRect()
    const tabRect = target.getBoundingClientRect()
    
    setIndicatorStyle({
      left: tabRect.left - listRect.left,
      width: tabRect.width,
      opacity: 1,
    })
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    updateIndicator(e.currentTarget)
  }

  const handleMouseLeave = () => {
    setIndicatorStyle(prev => ({ ...prev, opacity: 0 }))
  }

  // Clone children and add handlers
  const childrenArray = React.Children.toArray(children)
  const enhancedChildren = React.Children.map(childrenArray, (child) => {
    if (React.isValidElement(child) && child.type === TabsTrigger) {
      return React.cloneElement(child as React.ReactElement, {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        className: `${child.props.className || ''} relative z-10`,
      })
    }
    return child
  })

  return (
    <div 
      ref={containerRef}
      className="relative"
      onMouseLeave={handleMouseLeave}
    >
      <div ref={tabsListRef}>
        <TabsList className="relative">
          {/* Animated background indicator */}
          <div
            className="absolute top-[3px] h-[calc(100%-6px)] bg-background/60 dark:bg-background/40 rounded-md pointer-events-none z-0"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              opacity: indicatorStyle.opacity,
              transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-out',
            }}
          />
          {enhancedChildren}
        </TabsList>
      </div>
    </div>
  )
}

export function SiteDetailClient({ site, members }: SiteDetailClientProps) {
  const router = useRouter()
  const sidebar = useSidebar()
  const hasInitializedRef = useRef(false)
  const { userName, userEmail, userAvatar } = useUserProfile()
  const { workspace } = useWorkspace()
  const { isMultiUserPlan } = useAppData()

  // Get display name and plan
  const displayName = workspace && isMultiUserPlan(workspace.plan)
    ? workspace.name
    : (userName || 'Real Estate Co.')
  const displayPlan = workspace ? normalizePlan(workspace.plan) : 'free'

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
      <header className="relative flex h-12 shrink-0 items-center gap-2 border-b px-4 bg-background">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumbs
          items={[
            { label: 'Sites', href: '/sites' },
            { label: site.title, href: `/sites/${site.id}` },
          ]}
        />
        
        {/* Center - Tabs */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <Tabs defaultValue="layout" className="w-full">
            <HoverableTabsList>
              <TabsTrigger value="layout">Layout</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="leads">Leads</TabsTrigger>
            </HoverableTabsList>
          </Tabs>
        </div>

        {/* Right side - Actions */}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Always use current origin to ensure cookies/session are shared
              // For localhost, preserve the port number
              const { protocol, hostname, port } = window.location
              const baseUrl = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`
              const previewUrl = `${baseUrl}/preview/${site.id}`
              window.open(previewUrl, '_blank', 'noopener,noreferrer')
            }}
          >
            <ExternalLink className="size-4" />
            <span className="hidden md:inline">Preview</span>
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="size-4" />
                <span className="hidden md:inline">Settings</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Site Settings</h4>
                  <p className="text-sm text-muted-foreground">
                    Manage site configuration and preferences.
                  </p>
                </div>
                <div className="max-h-[50vh] overflow-y-auto">
                  {/* Settings content can go here */}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button 
            size="sm"
            onClick={async () => {
              if (site.status === 'published') {
                const result = await handleUnpublishSite(site.id)
                if ('error' in result) {
                  toast.error(result.error)
                } else {
                  toastSuccess('Site unpublished')
                  router.refresh()
                }
              } else {
                const result = await handlePublishSite(site.id)
                if ('error' in result) {
                  toast.error(result.error)
                } else {
                  toastSuccess('Site published successfully')
                  router.refresh()
                }
              }
            }}
          >
            {site.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
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

