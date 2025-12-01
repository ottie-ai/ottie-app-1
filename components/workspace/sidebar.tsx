'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useUserProfile, useWorkspace, useAppData } from '@/contexts/app-context'
import { useWorkspaces } from '@/hooks/use-workspaces'
import { normalizePlan, isMultiUserPlan } from '@/lib/utils'
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
  ExternalLink,
  Sparkles,
  MessageSquare,
  Lightbulb,
  Bug,
  ChevronRight,
  BookOpen,
  Users,
} from 'lucide-react'
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
import { PricingDialog } from '@/components/workspace/pricing-dialog'

const mainNavItems = [
  {
    title: 'Overview',
    url: '/overview',
    icon: LayoutDashboard,
  },
  {
    title: 'Sites',
    url: '/sites',
    icon: Globe,
  },
  {
    title: 'Leads',
    url: '/leads',
    icon: Users,
  },
  {
    title: 'Client Portals',
    url: '/client-portals',
    icon: SquareUser,
    badge: 'Coming Soon',
  },
]

const bottomNavItems = [
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { state, isMobile, setOpenMobile } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const { user } = useAuth()
  const { userName, userEmail, userAvatar } = useUserProfile()
  const { allWorkspaces, currentWorkspace, currentMembership, loading: appDataLoading } = useAppData()
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
  
  // Get display name - workspace name for multi-user plans, "Ottie" for single-user
  const displayName = workspace && isMultiUserPlan(workspace.plan)
    ? workspace.name
    : 'Ottie'
  
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
    <Sidebar collapsible="icon" className="relative overflow-hidden" suppressHydrationWarning>
      {/* Background Sphere - exact same as homepage, just scaled down */}
      {!isCollapsed && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/4 pointer-events-none z-0">
          <div className="sphere-sidebar-wrapper opacity-80">
            <div className="sphere-background">
              {Array.from({ length: 36 }, (_, i) => (
                <div key={i + 1} className={`ring${i + 1}`} />
              ))}
            </div>
          </div>
        </div>
      )}

      <SidebarHeader className="relative z-10 group-data-[collapsible=icon]:p-0 px-0 py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild suppressHydrationWarning>
                <SidebarMenuButton
                  size="lg"
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
                    {!workspaceLoading && workspace && (
                      <span className="truncate text-xs capitalize">
                        {normalizePlan(workspace.plan)} Plan
                      </span>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-auto shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                {workspaces.length > 1 && (
                  <>
                    <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
                    {workspaces.map(({ workspace: ws, membership }) => (
                      <DropdownMenuItem
                        key={ws.id}
                        onClick={() => {
                          handleSwitchWorkspace(ws.id)
                          if (isMobile) {
                            setOpenMobile(false)
                          }
                        }}
                        className={workspace?.id === ws.id ? 'bg-accent' : ''}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate">{ws.name}</span>
                          {workspace?.id === ws.id && (
                            <span className="text-xs text-muted-foreground ml-2">Current</span>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
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
                    {!isAgent && (
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
          <SidebarGroupContent className="relative px-2">
            {!isCollapsed && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  placeholder="Search sites..." 
                  className="pl-9 h-9"
                />
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* New Site Button */}
        <SidebarGroup className="py-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="New Site"
                  className="bg-primary text-primary-foreground hover:!bg-primary/90 hover:!text-primary-foreground active:!bg-primary/80"
                >
              <Plus className="size-4" />
                  <span>New Site</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url} onClick={handleLinkClick}>
                      <item.icon className="size-4" />
                      <span className="flex-1">{item.title}</span>
                      {'badge' in item && item.badge && (
                        <Badge className="text-[10px] px-1.5 py-0 h-5 gradient-ottie hover:opacity-90 text-white border-0">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Support & Settings */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={!('external' in item) && pathname === item.url}
                    tooltip={item.title}
                  >
                    {'external' in item && item.external ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                        <ExternalLink className="!size-3 text-muted-foreground" />
                      </a>
                    ) : (
                      <Link href={item.url} onClick={handleLinkClick}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Help & Support */}
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild suppressHydrationWarning>
                    <SidebarMenuButton 
                      asChild={false}
                      isActive={false}
                      tooltip="Help & Support"
                    >
                      <HelpCircle className="size-4" />
                      <span>Help & Support</span>
                      <ChevronRight className="ml-auto size-4" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-56 rounded-lg"
                    align="end"
                    side="right"
                    sideOffset={4}
                  >
                    <DropdownMenuItem>
                      <Sparkles className="mr-2 size-4" />
                      AI Copilot
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <MessageSquare className="mr-2 size-4" />
                      Contact Support
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <BookOpen className="mr-2 size-4" />
                      Documentation
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={openUserJot}>
                      <Lightbulb className="mr-2 size-4" />
                      Suggest Feature
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={openUserJot}>
                      <Bug className="mr-2 size-4" />
                      Flag Bug
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>

              {/* Feedback Button */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={openUserJot}
                  tooltip="Got Feedback?"
                  suppressHydrationWarning
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="url(#ottie-gradient-feedback)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <defs>
                      <linearGradient id="ottie-gradient-feedback" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fda90f" />
                        <stop offset="50%" stopColor="#e5a4b4" />
                        <stop offset="100%" stopColor="#c89eff" />
                      </linearGradient>
                    </defs>
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
                    <path d="M20 3v4"/>
                    <path d="M22 5h-4"/>
                    <path d="M4 17v2"/>
                    <path d="M5 18H3"/>
                  </svg>
                  <span className="gradient-ottie-text">Got Feedback?</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
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
                <DropdownMenuItem asChild>
                  <Link href="/settings" onClick={handleLinkClick}>
                    Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
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
