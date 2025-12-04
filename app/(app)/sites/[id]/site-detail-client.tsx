'use client'

import { useEffect, useRef } from 'react'
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
import { ChevronsUpDown, Settings, ExternalLink } from 'lucide-react'
import { normalizePlan } from '@/lib/utils'
import { useAppData, useUserProfile, useWorkspace } from '@/contexts/app-context'

const SIDEBAR_RESTORE_KEY = 'site_detail_restore_sidebar'

interface SiteDetailClientProps {
  site: Site
  members: Array<{
    membership: { user_id: string }
    profile: { avatar_url: string | null; full_name: string | null; email: string | null }
  }>
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
        
        {/* Center - Logo & Workspace */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5">
          <svg className="h-4 w-auto" viewBox="0 0 389 145" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M283.836 90.992C283.836 84.224 285.027 77.7067 287.408 71.44C289.789 65.048 293.236 59.408 297.748 54.52C302.26 49.632 307.712 45.7467 314.104 42.864C320.496 39.9814 327.703 38.54 335.724 38.54C343.62 38.54 350.827 39.9187 357.344 42.676C363.861 45.308 369.439 49.0054 374.076 53.768C378.713 58.5307 382.285 64.2334 384.792 70.876C387.424 77.5187 388.74 84.788 388.74 92.684C388.74 93.812 388.74 94.752 388.74 95.504C388.74 96.256 388.677 97.196 388.552 98.324H308.088C309.341 105.844 312.537 111.609 317.676 115.62C322.815 119.505 328.956 121.448 336.1 121.448C342.116 121.448 347.192 120.508 351.328 118.628C355.464 116.748 359.663 113.991 363.924 110.356L381.784 125.208C379.528 127.715 376.896 130.096 373.888 132.352C370.88 134.483 367.496 136.425 363.736 138.18C359.976 139.809 355.777 141.125 351.14 142.128C346.628 143.131 341.615 143.632 336.1 143.632C328.204 143.632 320.997 142.253 314.48 139.496C308.088 136.739 302.573 133.041 297.936 128.404C293.424 123.641 289.915 118.064 287.408 111.672C285.027 105.155 283.836 98.2614 283.836 90.992ZM309.216 78.584H363.548C361.793 72.6934 358.472 68.1187 353.584 64.86C348.696 61.476 342.868 59.784 336.1 59.784C329.833 59.784 324.381 61.3507 319.744 64.484C315.232 67.492 311.723 72.192 309.216 78.584Z" fill="currentColor"/>
            <path d="M238.797 141V41.172H263.801V141H238.797ZM235.225 15.228C235.225 10.8413 236.791 7.20667 239.925 4.324C243.058 1.44133 246.818 0 251.205 0C255.717 0 259.477 1.62933 262.485 4.888C265.618 8.14667 267.185 12.032 267.185 16.544C267.185 20.9307 265.618 24.6907 262.485 27.824C259.351 30.9573 255.591 32.524 251.205 32.524C246.567 32.524 242.745 30.832 239.737 27.448C236.729 23.9387 235.225 19.8653 235.225 15.228Z" fill="currentColor"/>
            <path d="M172.469 41.172H185.253V4.32397H210.257V41.172H225.109V62.792H210.257V141H185.253V62.792H172.469V41.172Z" fill="currentColor"/>
            <path d="M113.352 41.172H126.136V4.32397H151.14V41.172H165.992V62.792H151.14V141H126.136V62.792H113.352V41.172Z" fill="currentColor"/>
            <path d="M0 91.452C0 84.0573 1.37867 77.164 4.136 70.772C6.89333 64.38 10.6533 58.8653 15.416 54.228C20.304 49.4653 25.8813 45.768 32.148 43.136C38.54 40.3787 45.308 39 52.452 39C59.596 39 66.3013 40.3787 72.568 43.136C78.96 45.768 84.5373 49.4653 89.3 54.228C94.188 58.8653 98.0107 64.38 100.768 70.772C103.525 77.164 104.904 84.0573 104.904 91.452C104.904 98.7213 103.588 105.552 100.956 111.944C98.324 118.336 94.6267 123.913 89.864 128.676C85.2267 133.439 79.712 137.199 73.32 139.956C66.928 142.713 59.972 144.092 52.452 144.092C44.932 144.092 37.976 142.713 31.584 139.956C25.192 137.199 19.6147 133.439 14.852 128.676C10.2147 123.913 6.58 118.336 3.948 111.944C1.316 105.552 0 98.7213 0 91.452ZM25.192 91.64C25.192 96.0267 25.8813 99.9747 27.26 103.484C28.764 106.993 30.7067 110.001 33.088 112.508C35.5947 115.015 38.4773 116.957 41.736 118.336C45.12 119.715 48.692 120.404 52.452 120.404C56.212 120.404 59.7213 119.715 62.98 118.336C66.364 116.957 69.2467 115.015 71.628 112.508C74.1347 110.001 76.0773 106.993 77.456 103.484C78.96 99.9747 79.712 96.0267 79.712 91.64C79.712 87.3787 79.0227 83.4933 77.644 79.984C76.3907 76.4747 74.5733 73.4667 72.192 70.96C69.8107 68.328 66.928 66.3227 63.544 64.944C60.16 63.44 56.4627 62.688 52.452 62.688C48.4413 62.688 44.744 63.44 41.36 64.944C37.976 66.3227 35.0933 68.328 32.712 70.96C30.3307 73.4667 28.4507 76.4747 27.072 79.984C25.8187 83.4933 25.192 87.3787 25.192 91.64Z" fill="currentColor"/>
          </svg>
          <span className="text-muted-foreground text-sm mr-[-6px]">×</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 md:gap-2">
                <div className="flex items-center gap-1 md:gap-2">
                  <div className="size-4 rounded-full bg-gradient-to-br from-lime-400 via-amber-300 to-orange-500" />
                  <span className="text-sm font-medium hidden sm:inline">{displayName}</span>
                </div>
                <Badge variant="secondary" className="hidden md:inline-flex capitalize">
                  {displayPlan}
                </Badge>
                <ChevronsUpDown className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    <AvatarImage src={userAvatar || undefined} alt={userName || ''} />
                    <AvatarFallback>
                      {userName
                        ?.split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userEmail}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

