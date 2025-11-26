'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  House,
  Files,
  Gear,
  CreditCard,
  Question,
  SignOut,
  Plus,
  MagnifyingGlass,
  Users,
} from '@phosphor-icons/react'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CaretUpDown } from '@phosphor-icons/react'

const mainNavItems = [
  {
    title: 'Home',
    url: '/dashboard',
    icon: House,
  },
  {
    title: 'My Pages',
    url: '/dashboard/pages',
    icon: Files,
  },
  {
    title: 'Client Portals',
    url: '/dashboard/client-portals',
    icon: Users,
    badge: 'Coming Soon',
  },
]

const bottomNavItems = [
  {
    title: 'Settings',
    url: '/dashboard/settings',
    icon: Gear,
  },
  {
    title: 'Billing',
    url: '/dashboard/billing',
    icon: CreditCard,
  },
  {
    title: 'Help & Support',
    url: '/dashboard/help',
    icon: Question,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <svg 
                      className="size-4" 
                      viewBox="0 0 104 105" 
                      fill="none"
                    >
                      <path d="M64.1533 0C64.4902 12.9567 69.5982 23.6894 79.6943 31.8545C86.6667 37.4932 94.7378 40.4266 103.639 40.7432V64.3857C85.1152 64.3976 64.5748 80.2318 64.1436 104.999H40.8438C40.6221 93.8065 36.6974 84.1025 28.7451 76.1826C20.8373 68.307 11.1917 64.3918 0 64.1738V40.8877C22.7104 40.5504 40.5972 22.4718 40.8721 0H64.1533ZM52.5244 36.8252C48.1079 42.9632 42.9675 48.1732 36.8076 52.5088C42.9832 56.8524 48.1253 62.0588 52.4561 68.1006C54.1821 65.9963 55.7127 63.9624 57.4229 62.0938C59.140 60.2175 61.0364 58.5055 63.0225 56.5693C64.7176 55.2107 66.413 53.8517 68.1543 52.4561C62.0948 48.1837 56.9302 42.9915 52.5244 36.8252Z" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Ottie</span>
                    <span className="truncate text-xs text-muted-foreground">Free Plan</span>
                  </div>
                  <CaretUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <DropdownMenuItem>
                  Upgrade to Pro
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  Account Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Search */}
        <SidebarGroup className="py-0">
          <SidebarGroupContent className="relative">
            {!isCollapsed && (
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  placeholder="Search pages..." 
                  className="pl-9 h-9"
                />
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* New Page Button */}
        <SidebarGroup className="py-0">
          <SidebarGroupContent>
            <Button className="w-full justify-start gap-2" size="sm">
              <Plus className="size-4" weight="bold" />
              {!isCollapsed && <span>New Page</span>}
            </Button>
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
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span className="flex-1">{item.title}</span>
                      {'badge' in item && item.badge && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
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
          <SidebarGroupLabel>Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src="" alt="John Doe" />
                    <AvatarFallback className="rounded-lg">JD</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">John Doe</span>
                    <span className="truncate text-xs text-muted-foreground">john@example.com</span>
                  </div>
                  <CaretUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <SignOut className="mr-2 size-4" />
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

