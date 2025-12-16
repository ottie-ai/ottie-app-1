'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useAuth } from '@/hooks/use-auth'
import { useUserProfile, useWorkspace, useAppData } from '@/contexts/app-context'
import { useWorkspaces } from '@/hooks/use-workspaces'
import { normalizePlan } from '@/lib/utils'
import { signOut } from '@/lib/supabase/auth'
import {
  LayoutDashboard,
  Globe,
  Settings,
  HelpCircle,
  LogOut,
  Plus,
  UserPlus,
  Search,
  SquareUser,
  ChevronsUpDown,
  ChevronRight,
  Check,
  ExternalLink,
  Lightbulb,
  Bug,
  BookOpen,
  Users,
  Repeat,
  Crown,
  Zap,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { LottieGlobeIcon } from '@/components/ui/lottie-globe-icon'
import { LottieViewIcon } from '@/components/ui/lottie-view-icon'
import { LottieAnalyticsIcon } from '@/components/ui/lottie-analytics-icon'
import { LottieGroupsIcon } from '@/components/ui/lottie-groups-icon'
import { LottieSettingsIcon } from '@/components/ui/lottie-settings-icon'
import { LottieBulbIcon } from '@/components/ui/lottie-bulb-icon'
import { LottieBugIcon } from '@/components/ui/lottie-bug-icon'
import { LottieFileIcon } from '@/components/ui/lottie-file-icon'
import { LottieMailOpenIcon } from '@/components/ui/lottie-mail-open-icon'
import { LottieSupportIcon } from '@/components/ui/lottie-support-icon'
import { LottieForumIcon } from '@/components/ui/lottie-forum-icon'
import { LottieContactsIcon } from '@/components/ui/lottie-contacts-icon'
import { LottieScreenShareIcon } from '@/components/ui/lottie-screen-share-icon'
import { LottieLaptopIcon } from '@/components/ui/lottie-laptop-icon'
import { LottieViewArrayIcon } from '@/components/ui/lottie-view-array-icon'
import { LottieViewQuiltIcon } from '@/components/ui/lottie-view-quilt-icon'
import { LottieAccountIcon } from '@/components/ui/lottie-account-icon'
import { LottieLogoutIcon } from '@/components/ui/lottie-logout-icon'
import { LottieSearchIcon } from '@/components/ui/lottie-search-icon'
import { LottieSwapIcon } from '@/components/ui/lottie-swap-icon'
import { LottieLinkIcon } from '@/components/ui/lottie-link-icon'
import { LottieSunIcon } from '@/components/ui/lottie-sun-icon'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnimatedTabsList } from '@/components/ui/animated-tabs-list'
import { AnimatedSidebarMenu } from '@/components/ui/animated-sidebar-menu'
import { PricingDialog } from '@/components/workspace/pricing-dialog'

const mainNavItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LottieAnalyticsIcon,
  },
  {
    title: 'Sites',
    url: '/sites',
    icon: LottieGlobeIcon,
  },
  {
    title: 'Leads',
    url: '/leads',
    icon: LottieGroupsIcon,
  },
  {
    title: 'Client Portals',
    url: '/client-portals',
    icon: LottieViewQuiltIcon,
    badge: 'Coming Soon',
  },
]

const bottomNavItems = [
  {
    title: 'Settings',
    url: '/settings',
    icon: LottieSettingsIcon,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { state, isMobile, setOpenMobile, setOpen } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const [helpSupportOpen, setHelpSupportOpen] = useState(false)
  const { user } = useAuth()
  const { userName, userEmail, userAvatar } = useUserProfile()
  const { allWorkspaces, currentWorkspace, currentMembership, loading: appDataLoading, isMultiUserPlan } = useAppData()
  const { workspaces: workspacesFromHook } = useWorkspaces()
  
  // Use currentWorkspace and allWorkspaces from app-context (loaded with appData) - they're immediately available
  const workspace = currentWorkspace
  const workspaceLoading = appDataLoading
  
  // Use allWorkspaces from app-context (loaded with appData) if available, otherwise fallback to hook
  // allWorkspaces are already loaded with appData when app loads, so they're immediately available
  const workspaces = allWorkspaces.length > 0
    ? allWorkspaces.map(({ workspace: ws, role }) => ({
        workspace: ws,
        membership: {
          id: '', // Not needed for display
          workspace_id: ws.id,
          user_id: '', // Not needed for display
          role: role as 'owner' | 'admin' | 'agent',
          last_active_at: null,
          created_at: ws.created_at,
        },
      }))
    : workspacesFromHook
  const [mounted, setMounted] = useState(false)
  
  // Check if user is agent
  const isAgent = currentMembership?.role === 'agent'
  const isOwnerOrAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'admin'
  
  // Close sidebar on mobile when clicking a link
  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }
  
  // Get display name - always use workspace name if available
  const displayName = workspace?.name || 'Ottie'
  
  // Handle workspace switching
  const handleSwitchWorkspace = async (workspaceId: string) => {
    if (typeof window === 'undefined') return
    
    // Store selected workspace ID in localStorage
    localStorage.setItem('current_workspace_id', workspaceId)
    
    // Refresh the page to reload with new workspace
    router.refresh()
    window.location.reload()
  }

  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Get initials for avatar fallback
  const getInitials = (name: string, email: string) => {
    if (name && name !== email.split('@')[0]) {
      const parts = name.split(' ')
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  const openUserJot = () => {
    if (typeof window === 'undefined') return

    const win = window as any
    
    // Use the official UserJot API to show widget
    if (win.uj && win.uj.showWidget) {
      win.uj.showWidget({ section: 'feedback' })
    } else if (win.$ujq) {
      // Queue the command if SDK is still loading
      win.$ujq.push(['showWidget', { section: 'feedback' }])
    } else {
      // Initialize queue and push command
      win.$ujq = []
      win.$ujq.push(['showWidget', { section: 'feedback' }])
    }
  }




  return (
    <Sidebar collapsible="icon" className="relative overflow-hidden overflow-x-hidden" suppressHydrationWarning>
      <SidebarHeader className="relative z-10 group-data-[collapsible=icon]:p-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild suppressHydrationWarning>
                <SidebarMenuButton
                  size="lg"
                  tooltip={displayName}
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="gradient-ottie flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg">
                    <svg 
                      className="size-4 text-white" 
                      viewBox="0 0 104 105" 
                      fill="none"
                    >
                      <path d="M64.1533 0C64.4902 12.9567 69.5982 23.6894 79.6943 31.8545C86.6667 37.4932 94.7378 40.4266 103.639 40.7432V64.3857C85.1152 64.3976 64.5748 80.2318 64.1436 104.999H40.8438C40.6221 93.8065 36.6974 84.1025 28.7451 76.1826C20.8373 68.307 11.1917 64.3918 0 64.1738V40.8877C22.7104 40.5504 40.5972 22.4718 40.8721 0H64.1533ZM52.5244 36.8252C48.1079 42.9632 42.9675 48.1732 36.8076 52.5088C42.9832 56.8524 48.1253 62.0588 52.4561 68.1006C54.1821 65.9963 55.7127 63.9624 57.4229 62.0938C59.140 60.2175 61.0364 58.5055 63.0225 56.5693C64.7176 55.2107 66.413 53.8517 68.1543 52.4561C62.0948 48.1837 56.9302 42.9915 52.5244 36.8252Z" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                    <span className="truncate font-medium">{displayName}</span>
                    {!workspaceLoading && workspace && (() => {
                      const plan = normalizePlan(workspace.plan)
                      const isPaid = plan !== 'free'
                      const isEnterprise = plan === 'enterprise'
                      const isGrowth = plan === 'growth'
                      const isStarter = plan === 'starter'
                      return isPaid ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border ${
                            isEnterprise
                              ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-blue-500/30 dark:border-blue-400/20'
                              : isGrowth
                              ? 'bg-gradient-to-r from-purple-500/20 to-violet-500/20 border-purple-500/30 dark:border-purple-400/20'
                              : isStarter
                              ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 dark:border-green-400/20'
                              : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30 dark:border-amber-400/20'
                          }`}>
                            <Crown className={`size-2.5 ${
                              isEnterprise
                                ? 'text-blue-600 dark:text-blue-400'
                                : isGrowth
                                ? 'text-purple-600 dark:text-purple-400'
                                : isStarter
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`} />
                            <span className={`truncate text-[10px] font-semibold capitalize ${
                              isEnterprise
                                ? 'text-blue-700 dark:text-blue-300'
                                : isGrowth
                                ? 'text-purple-700 dark:text-purple-300'
                                : isStarter
                                ? 'text-green-700 dark:text-green-300'
                                : 'text-amber-700 dark:text-amber-300'
                            }`}>
                              {plan}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="truncate text-xs capitalize text-muted-foreground">
                            {plan} Plan
                      </span>
                          {currentMembership?.role === 'owner' && (
                            <PricingDialog 
                              currentPlan={workspace?.plan} 
                              stripeCustomerId={workspace?.stripe_customer_id}
                              workspaceId={workspace?.id}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-5 px-2 text-[10px] font-medium"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Upgrade
                              </Button>
                            </PricingDialog>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                  {workspaces.length > 1 && (
                    <LottieSwapIcon className="ml-auto shrink-0" size={18} />
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                {workspaces.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-sidebar-foreground/70 text-xs font-medium px-2 h-8">
                      Workspaces
                    </DropdownMenuLabel>
                        {workspaces.map(({ workspace: ws, membership }) => {
                          const isCurrent = workspace?.id === ws.id
                          return (
                      <DropdownMenuItem
                        key={ws.id}
                        onClick={() => {
                                if (!isCurrent) {
                          handleSwitchWorkspace(ws.id)
                          if (isMobile) {
                            setOpenMobile(false)
                          }
                                }
                        }}
                              className={isCurrent 
                                ? 'cursor-default opacity-60 pointer-events-none' 
                                : ''
                              }
                              onPointerDown={(e) => {
                                if (isCurrent) {
                                  e.preventDefault()
                                  e.stopPropagation()
                                }
                              }}
                              onMouseEnter={(e) => {
                                if (isCurrent) {
                                  e.currentTarget.style.backgroundColor = ''
                                }
                              }}
                      >
                              <div className="flex items-center gap-2 w-full">
                                <Avatar className="h-6 w-6 shrink-0 rounded">
                                  <AvatarImage src={ws.logo_url || undefined} alt={ws.name} />
                                  <AvatarFallback className="text-xs rounded bg-muted">
                                    {ws.name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate flex-1">{ws.name}</span>
                                {isCurrent && (
                                  <Check className="h-4 w-4 shrink-0 text-primary" />
                          )}
                        </div>
                      </DropdownMenuItem>
                          )
                        })}
                  </>
                )}
                {!workspaceLoading && workspace && isMultiUserPlan(workspace.plan) ? (
                  <>
                    {isOwnerOrAdmin && (
                  <>
                    <DropdownMenuItem asChild className="text-primary focus:text-primary">
                      <Link href="/settings?tab=team" className="flex items-center gap-2" onClick={handleLinkClick}>
                        <UserPlus className="h-4 w-4" />
                        Invite Users
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/settings?tab=workspace" onClick={handleLinkClick}>Workspace Settings</Link>
                    </DropdownMenuItem>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {currentMembership?.role === 'owner' && (
                  <>
                    <PricingDialog currentPlan={workspace?.plan} stripeCustomerId={workspace?.stripe_customer_id}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        Upgrade
                  </DropdownMenuItem>
                </PricingDialog>
                    <DropdownMenuItem asChild className="text-primary focus:text-primary">
                      <Link href="/settings?tab=team" className="flex items-center gap-2" onClick={handleLinkClick}>
                        <UserPlus className="h-4 w-4" />
                        Invite Users
                      </Link>
                </DropdownMenuItem>
                      </>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="relative z-10">
        {/* Search */}
        <SidebarGroup className="py-0 px-0">
          <SidebarGroupContent className="px-2">
            {!isCollapsed && (
              <div className="relative w-full">
                <LottieSearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input 
                  placeholder="Search sites..." 
                  className="pl-9 w-full h-8 bg-transparent dark:bg-transparent"
                />
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <AnimatedSidebarMenu activePath={pathname}>
              {mainNavItems.map((item) => {
                // For "Sites", also check if we're on a site detail or builder page
                const isActive = item.title === 'Sites'
                  ? pathname === item.url || pathname?.startsWith('/sites/') || pathname?.startsWith('/builder/')
                  : pathname === item.url
                
                return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive}
                    tooltip={item.title}
                  >
                    <Link href={item.url} onClick={handleLinkClick}>
                      <item.icon className="size-[18px] group-data-[collapsible=icon]:-ml-px" {...({ invertTheme: isActive, forceLightMode: isActive } as any)} />
                      <span className="flex-1">{item.title}</span>
                      {'badge' in item && item.badge && (
                        <Badge className="text-[10px] px-1.5 py-0 h-5 gradient-ottie hover:opacity-90 text-white border-0">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                )
              })}
            </AnimatedSidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Support & Settings */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <AnimatedSidebarMenu activePath={pathname}>
              {bottomNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={!('external' in item) && pathname === item.url}
                    tooltip={item.title}
                  >
                    {'external' in item && item.external ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <item.icon className="size-[18px] group-data-[collapsible=icon]:-ml-px" />
                        <span className="flex-1">{item.title}</span>
                        <ExternalLink className="!size-3 text-muted-foreground" />
                      </a>
                    ) : (
                      <Link href={item.url} onClick={handleLinkClick}>
                        <item.icon className="size-[18px] group-data-[collapsible=icon]:-ml-px" {...({ invertTheme: !('external' in item) && pathname === item.url, forceLightMode: !('external' in item) && pathname === item.url } as any)} />
                        <span className="flex-1">{item.title}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Help & Support */}
              <SidebarMenuItem>
                <Popover open={helpSupportOpen} onOpenChange={setHelpSupportOpen}>
                  <PopoverTrigger asChild>
                    <SidebarMenuButton 
                      asChild
                      isActive={false}
                      tooltip="Help & Support"
                    >
                      <div 
                        onClick={() => setHelpSupportOpen(!helpSupportOpen)}
                        className="flex w-full items-center gap-2 cursor-pointer"
                      >
                        <LottieSupportIcon className="size-[18px] group-data-[collapsible=icon]:-ml-px" />
                        <span className="flex-1">Help & Support</span>
                      </div>
                    </SidebarMenuButton>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-56 rounded-lg p-1"
                    align="end"
                    side="right"
                    sideOffset={4}
                  >
                    <div className="flex flex-col">
                      <button
                        onClick={() => {
                          window.location.href = 'mailto:support@ottie.com'
                          setHelpSupportOpen(false)
                        }}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      >
                        <LottieMailOpenIcon className="size-4" />
                        Contact Support
                      </button>
                      <button
                        onClick={() => {
                          window.open('https://docs.ottie.com', '_blank')
                          setHelpSupportOpen(false)
                        }}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      >
                        <LottieFileIcon className="size-4" />
                        Documentation
                      </button>
                      <div className="my-1 h-px bg-border" />
                      <button
                        onClick={() => {
                          openUserJot()
                          setHelpSupportOpen(false)
                        }}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      >
                        <LottieBulbIcon className="size-4" />
                        Suggest Feature
                      </button>
                      <button
                        onClick={() => {
                          openUserJot()
                          setHelpSupportOpen(false)
                        }}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      >
                        <LottieBugIcon className="size-4" />
                        Report Bug
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </SidebarMenuItem>

              {/* Feedback Button */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Got Feedback?"
                  suppressHydrationWarning
                >
                  <div onClick={openUserJot} className="flex w-full items-center gap-2 cursor-pointer">
                    <LottieForumIcon className="size-[18px] group-data-[collapsible=icon]:-ml-px" />
                    <span className="flex-1 gradient-ottie-text">Got Feedback?</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </AnimatedSidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className="relative z-10 group-data-[collapsible=icon]:p-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild suppressHydrationWarning>
                <SidebarMenuButton
                  size="lg"
                  tooltip={userName}
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg shrink-0">
                    <AvatarImage src={userAvatar || undefined} alt={userName} />
                    <AvatarFallback className="rounded-lg">
                      {getInitials(userName, userEmail)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{userName}</span>
                    <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <div className="px-2 py-1.5 flex items-center justify-between">
                  <span className="text-sm">Theme</span>
                  <Tabs value={theme || 'system'} onValueChange={(value) => setTheme(value as 'system' | 'light' | 'dark')}>
                    <AnimatedTabsList activeValue={theme || 'system'}>
                      <TabsTrigger value="system" className="size-8 p-0">
                        <Monitor className="size-4" />
                      </TabsTrigger>
                      <TabsTrigger value="light" className="size-8 p-0">
                        <Sun className="size-4" />
                      </TabsTrigger>
                      <TabsTrigger value="dark" className="size-8 p-0">
                        <Moon className="size-4" />
                      </TabsTrigger>
                    </AnimatedTabsList>
                  </Tabs>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/" onClick={handleLinkClick} className="flex items-center gap-2">
                    <LottieLinkIcon className="size-[18px]" />
                    Homepage
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" onClick={handleLinkClick} className="flex items-center gap-2">
                    <LottieAccountIcon className="size-[18px]" />
                    Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2">
                  <LottieLogoutIcon className="size-[18px]" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
